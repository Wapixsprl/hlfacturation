import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { FacturePDF } from '@/lib/pdf/facture-template'
import { envoyerFacture } from '@/lib/brevo/emails'
import { formatMontant, getAppUrl } from '@/lib/utils'
import { decryptApiKey, factureViewSig, mollieWebhookSig } from '@/lib/payments/encryption'
import { getPaymentProvider } from '@/lib/payments/factory'
import { randomUUID } from 'crypto'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  // 2. Fetch facture with relations
  const { data: facture, error: factureError } = await supabase
    .from('factures')
    .select('*, client:clients(id, nom, prenom, raison_sociale, type, email, adresse, code_postal, ville, pays, tva_numero), entreprise:entreprises(*)')
    .eq('id', id)
    .single()

  if (factureError || !facture) {
    return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 })
  }

  // 3. Validate: client must have email
  const clientEmail = facture.client?.email
  if (!clientEmail) {
    return NextResponse.json(
      { error: "Le client n'a pas d'adresse email configuree" },
      { status: 400 }
    )
  }

  // 4. Fetch facture lines
  const { data: lignes } = await supabase
    .from('factures_lignes')
    .select('*')
    .eq('facture_id', id)
    .order('ordre')

  // 5. Generate PDF
  const pdfBuffer = await renderToBuffer(
    <FacturePDF
      facture={facture}
      lignes={lignes || []}
      client={facture.client}
      entreprise={facture.entreprise}
    />
  )

  // 6. Upload PDF to Supabase Storage
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const pdfPath = `factures/${facture.numero}.pdf`
  const { error: uploadError } = await serviceSupabase.storage
    .from('pdfs')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json(
      { error: 'Erreur lors du stockage du PDF: ' + uploadError.message },
      { status: 500 }
    )
  }

  // 7. Get signed URL for the PDF (30 days)
  const { data: signedUrlData } = await serviceSupabase.storage
    .from('pdfs')
    .createSignedUrl(pdfPath, 60 * 60 * 24 * 30)

  const pdfUrl = signedUrlData?.signedUrl
  if (!pdfUrl) {
    return NextResponse.json(
      { error: 'Erreur generation URL PDF' },
      { status: 500 }
    )
  }

  // 8. Update facture status + pdf_url + increment nombre_envois
  const currentEnvois = facture.nombre_envois || 0
  const { error: updateError } = await serviceSupabase
    .from('factures')
    .update({
      statut: 'envoyee',
      pdf_url: pdfUrl,
      nombre_envois: currentEnvois + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('Facture update error:', updateError)
    return NextResponse.json(
      { error: 'Erreur mise a jour de la facture: ' + updateError.message },
      { status: 500 }
    )
  }

  // 9. Client display name
  const clientNom =
    facture.client?.type === 'professionnel' && facture.client?.raison_sociale
      ? facture.client.raison_sociale
      : [facture.client?.prenom, facture.client?.nom].filter(Boolean).join(' ') ||
        'Client'

  // 10. Auto-create payment link if payment is enabled
  let paymentUrl: string | undefined
  const entreprise = facture.entreprise

  if (entreprise?.payment_enabled && entreprise?.payment_provider && entreprise.payment_provider !== 'none') {
    try {
      const provider = entreprise.payment_provider as 'mollie' | 'stripe'

      // Decrypt API key
      const encryptedKey = provider === 'mollie'
        ? entreprise.mollie_api_key_encrypted
        : entreprise.stripe_secret_key_encrypted

      if (encryptedKey) {
        const apiKey = decryptApiKey(encryptedKey)
        const webhookSecret = provider === 'stripe' && entreprise.stripe_webhook_secret_encrypted
          ? decryptApiKey(entreprise.stripe_webhook_secret_encrypted)
          : undefined

        // Calculate remaining balance
        const { data: existingPaiements } = await serviceSupabase
          .from('paiements_clients')
          .select('montant')
          .eq('facture_id', id)

        const totalPaye = (existingPaiements || []).reduce((sum, p) => sum + Number(p.montant), 0)
        const soldeRestant = Number(facture.solde_ttc || facture.total_ttc) - totalPaye

        if (soldeRestant > 0) {
          const appUrl = getAppUrl()
          const token = randomUUID()
          const tokenExpiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

          // Create payment session in DB
          const { data: session, error: sessionError } = await serviceSupabase
            .from('payment_sessions')
            .insert({
              entreprise_id: entreprise.id,
              facture_id: id,
              provider,
              montant: soldeRestant,
              devise: 'EUR',
              statut: 'created',
              token,
              token_expiration: tokenExpiration,
            })
            .select('id')
            .single()

          if (session && !sessionError) {
            // Create payment with provider
            const paymentProvider = getPaymentProvider(provider, apiKey, webhookSecret)
            const result = await paymentProvider.createPayment({
              amount: soldeRestant,
              description: `Facture ${facture.numero}`,
              redirectUrl: `${appUrl}/payer/${token}/retour`,
              webhookUrl: provider === 'mollie'
                ? `${appUrl}/api/webhooks/mollie?sig=${mollieWebhookSig(entreprise.id)}`
                : `${appUrl}/api/webhooks/stripe`,
              metadata: {
                facture_id: id,
                entreprise_id: entreprise.id,
                payment_session_id: session.id,
              },
            })

            // Update session with provider info
            await serviceSupabase
              .from('payment_sessions')
              .update({
                provider_payment_id: result.providerPaymentId,
                checkout_url: result.checkoutUrl,
                statut: 'pending',
                updated_at: new Date().toISOString(),
              })
              .eq('id', session.id)

            paymentUrl = `${appUrl}/payer/${token}`
          }
        }
      }
    } catch (paymentError) {
      // Log but don't block email sending if payment link creation fails
      console.error('Payment link creation error:', paymentError)
    }
  }

  // 11. Send email via Brevo
  const montantTTC = formatMontant(facture.total_ttc)
  const viewUrl = `${getAppUrl()}/api/factures/${id}/voir?sig=${factureViewSig(id)}`
  try {
    await envoyerFacture(clientEmail, clientNom, facture.numero, pdfUrl, montantTTC, id, paymentUrl, viewUrl)
  } catch (emailError) {
    console.error('Brevo email error:', emailError)
    return NextResponse.json({
      success: true,
      warning: "Facture mise a jour mais l'email n'a pas pu etre envoye. Verifiez la configuration Brevo.",
    })
  }

  return NextResponse.json({ success: true, paymentUrl })
}
