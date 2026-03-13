import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/brevo/emails'
import { formatMontant } from '@/lib/utils'

function notificationRefusHtml(
  clientNom: string,
  numero: string,
  montantTTC: string,
  dateRefus: string,
  ip: string
) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#DC2626;padding:28px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:600;">Devis refuse</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#141414;font-size:15px;line-height:1.6;font-weight:600;">
            ${clientNom} a refuse le devis ${numero}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="color:#9ca3af;font-size:12px;">Client</span><br>
                <span style="color:#141414;font-size:14px;font-weight:500;">${clientNom}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="color:#9ca3af;font-size:12px;">Montant TTC</span><br>
                <span style="color:#141414;font-size:14px;font-weight:600;">${montantTTC}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                <span style="color:#9ca3af;font-size:12px;">Date du refus</span><br>
                <span style="color:#141414;font-size:14px;">${dateRefus}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;">
                <span style="color:#9ca3af;font-size:12px;">Adresse IP</span><br>
                <span style="color:#141414;font-size:14px;">${ip}</span>
              </td>
            </tr>
          </table>
          <p style="margin:0;color:#707070;font-size:13px;line-height:1.5;">
            Vous pouvez contacter le client pour en discuter ou creer un nouveau devis.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #ebebeb;">
          <p style="margin:0;color:#adadad;font-size:11px;line-height:1.5;">
            HL Renovation — Notification interne automatique
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find devis by token
  const { data: devis, error: findError } = await supabase
    .from('devis')
    .select('id, numero, statut, signature_image, token_expiration, total_ttc, client_id, entreprise_id')
    .eq('token_signature', token)
    .single()

  if (findError || !devis) {
    return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 })
  }

  if (devis.signature_image) {
    return NextResponse.json({ error: 'Devis deja signe' }, { status: 400 })
  }

  if (devis.token_expiration && new Date(devis.token_expiration) < new Date()) {
    return NextResponse.json({ error: 'Lien expire' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const now = new Date()
  const dateRefus = new Intl.DateTimeFormat('fr-BE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(now)

  // Update devis: mark as refused (keep token so page can still show refused status)
  const { error: updateError } = await supabase
    .from('devis')
    .update({
      statut: 'refuse',
      updated_at: now.toISOString(),
    })
    .eq('id', devis.id)

  if (updateError) {
    return NextResponse.json({ error: 'Erreur de mise a jour' }, { status: 500 })
  }

  // Send notification email to admins
  try {
    const { data: client } = await supabase
      .from('clients')
      .select('email, nom, prenom, raison_sociale, type')
      .eq('id', devis.client_id)
      .single()

    const clientNom = client
      ? client.type === 'professionnel' && client.raison_sociale
        ? client.raison_sociale
        : [client.prenom, client.nom].filter(Boolean).join(' ')
      : ''

    const { data: utilisateurs } = await supabase
      .from('utilisateurs')
      .select('email, role')
      .eq('entreprise_id', devis.entreprise_id)
      .eq('actif', true)
      .in('role', ['super_admin', 'utilisateur'])

    if (utilisateurs && utilisateurs.length > 0) {
      const recipients = utilisateurs
        .filter((u) => u.email)
        .map((u) => ({ email: u.email }))

      if (recipients.length > 0) {
        await sendEmail({
          to: recipients,
          subject: `${clientNom} a refuse le devis ${devis.numero}`,
          htmlContent: notificationRefusHtml(
            clientNom,
            devis.numero,
            formatMontant(devis.total_ttc),
            dateRefus,
            ip
          ),
        }).catch((err) => console.error('Email notification refus failed:', err))
      }
    }
  } catch (emailErr) {
    console.error('Post-refus email error:', emailErr)
  }

  return NextResponse.json({ success: true })
}
