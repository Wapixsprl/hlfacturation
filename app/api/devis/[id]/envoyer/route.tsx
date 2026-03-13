import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import { DevisPDF } from '@/lib/pdf/devis-template'
import { envoyerDevis } from '@/lib/brevo/emails'
import { getAppUrl } from '@/lib/utils'
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

  // 2. Fetch devis with relations (RLS ensures entreprise isolation)
  const { data: devis, error: devisError } = await supabase
    .from('devis')
    .select('*, client:clients(*), entreprise:entreprises(*)')
    .eq('id', id)
    .single()

  if (devisError || !devis) {
    return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 })
  }

  // 3. Validate: client must have email
  const clientEmail = devis.client?.email
  if (!clientEmail) {
    return NextResponse.json(
      { error: "Le client n'a pas d'adresse email configuree" },
      { status: 400 }
    )
  }

  // 4. Fetch devis lines
  const { data: lignes } = await supabase
    .from('devis_lignes')
    .select('*')
    .eq('devis_id', id)
    .order('ordre')

  // 5. Generate PDF
  const pdfBuffer = await renderToBuffer(
    <DevisPDF
      devis={devis}
      lignes={lignes || []}
      client={devis.client}
      entreprise={devis.entreprise}
    />
  )

  // 6. Upload PDF to Supabase Storage (service role for storage access)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const pdfPath = `devis/${devis.numero}.pdf`
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

  // 8. Generate signature token + 30 day expiration
  const token = randomUUID()
  const expiration = new Date()
  expiration.setDate(expiration.getDate() + 30)

  // 9. Update devis status, token, pdf_url
  const { error: updateError } = await serviceSupabase
    .from('devis')
    .update({
      statut: 'envoye',
      token_signature: token,
      token_expiration: expiration.toISOString(),
      pdf_url: pdfUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('Devis update error:', updateError)
    return NextResponse.json(
      { error: 'Erreur mise a jour du devis: ' + updateError.message },
      { status: 500 }
    )
  }

  // 10. Build signature link
  const lienSignature = `${getAppUrl()}/signer/${token}`

  // 11. Client display name
  const clientNom =
    devis.client?.type === 'professionnel' && devis.client?.raison_sociale
      ? devis.client.raison_sociale
      : [devis.client?.prenom, devis.client?.nom].filter(Boolean).join(' ') ||
        'Client'

  // 12. Send email via Brevo
  try {
    await envoyerDevis(clientEmail, clientNom, devis.numero, pdfUrl, lienSignature, id)
  } catch (emailError) {
    console.error('Brevo email error:', emailError)
    return NextResponse.json({
      success: true,
      warning: "Devis mis a jour mais l'email n'a pas pu etre envoye. Verifiez la configuration Brevo.",
    })
  }

  return NextResponse.json({ success: true })
}
