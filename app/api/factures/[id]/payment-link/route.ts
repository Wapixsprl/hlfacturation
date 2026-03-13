import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { decryptApiKey } from '@/lib/payments/encryption'
import { getAppUrl } from '@/lib/utils'
import { getPaymentProvider } from '@/lib/payments/factory'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { data: utilisateur } = await supabase
      .from('utilisateurs')
      .select('entreprise_id, role')
      .eq('id', user.id)
      .single()
    if (!utilisateur) {
      return NextResponse.json({ error: 'Utilisateur non trouve' }, { status: 404 })
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Recuperer la facture
    const { data: facture } = await serviceSupabase
      .from('factures')
      .select('*, client:clients(*)')
      .eq('id', id)
      .eq('entreprise_id', utilisateur.entreprise_id)
      .single()

    if (!facture) {
      return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 })
    }

    // Verifier statut
    if (!['envoyee', 'partiellement_payee', 'en_retard'].includes(facture.statut)) {
      return NextResponse.json(
        { error: 'La facture doit etre envoyee pour generer un lien de paiement' },
        { status: 400 }
      )
    }

    // Recuperer config paiement
    const { data: entreprise } = await serviceSupabase
      .from('entreprises')
      .select('*')
      .eq('id', utilisateur.entreprise_id)
      .single()

    if (!entreprise?.payment_enabled || entreprise.payment_provider === 'none') {
      return NextResponse.json(
        { error: 'Le paiement en ligne n\'est pas active. Configurez-le dans Parametres.' },
        { status: 400 }
      )
    }

    // Dechiffrer la cle API
    let apiKey: string
    let webhookSecret: string | undefined
    if (entreprise.payment_provider === 'mollie') {
      if (!entreprise.mollie_api_key_encrypted) {
        return NextResponse.json({ error: 'Cle API Mollie non configuree' }, { status: 400 })
      }
      apiKey = decryptApiKey(entreprise.mollie_api_key_encrypted)
    } else {
      if (!entreprise.stripe_secret_key_encrypted) {
        return NextResponse.json({ error: 'Cle API Stripe non configuree' }, { status: 400 })
      }
      apiKey = decryptApiKey(entreprise.stripe_secret_key_encrypted)
      if (entreprise.stripe_webhook_secret_encrypted) {
        webhookSecret = decryptApiKey(entreprise.stripe_webhook_secret_encrypted)
      }
    }

    // Calculer solde restant
    const { data: paiements } = await serviceSupabase
      .from('paiements_clients')
      .select('montant')
      .eq('facture_id', id)

    const totalPaye = (paiements || []).reduce((sum, p) => sum + p.montant, 0)
    const soldeRestant = Math.round((facture.solde_ttc - totalPaye) * 100) / 100

    if (soldeRestant <= 0) {
      return NextResponse.json({ error: 'La facture est deja entierement payee' }, { status: 400 })
    }

    // Verifier s'il y a un montant custom dans le body
    let montant = soldeRestant
    try {
      const body = await request.json()
      if (body.montant && body.montant > 0 && body.montant <= soldeRestant) {
        montant = Math.round(body.montant * 100) / 100
      }
    } catch {
      // Pas de body JSON, on utilise le solde restant
    }

    // Generer le token
    const token = randomUUID()
    const expiration = new Date()
    expiration.setDate(expiration.getDate() + 7)

    const appUrl = getAppUrl()

    // Creer la session de paiement en base
    const { data: session, error: sessionError } = await serviceSupabase
      .from('payment_sessions')
      .insert({
        entreprise_id: utilisateur.entreprise_id,
        facture_id: id,
        provider: entreprise.payment_provider,
        montant,
        token,
        token_expiration: expiration.toISOString(),
      })
      .select()
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Erreur creation session' }, { status: 500 })
    }

    // Appeler le provider pour creer le paiement
    const provider = getPaymentProvider(entreprise.payment_provider, apiKey, webhookSecret)
    const webhookUrl = `${appUrl}/api/webhooks/${entreprise.payment_provider}`
    const redirectUrl = `${appUrl}/payer/${token}/retour`

    const result = await provider.createPayment({
      amount: montant,
      description: `Facture ${facture.numero}`,
      redirectUrl,
      webhookUrl,
      metadata: {
        facture_id: id,
        entreprise_id: utilisateur.entreprise_id,
        payment_session_id: session.id,
      },
    })

    // Mettre a jour la session avec les infos provider
    await serviceSupabase
      .from('payment_sessions')
      .update({
        provider_payment_id: result.providerPaymentId,
        checkout_url: result.checkoutUrl,
        statut: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    const paymentUrl = `${appUrl}/payer/${token}`

    return NextResponse.json({
      paymentUrl,
      checkoutUrl: result.checkoutUrl,
      sessionId: session.id,
      montant,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('Erreur payment-link:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
