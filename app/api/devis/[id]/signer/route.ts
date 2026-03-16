import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/brevo/emails'
import { formatMontant } from '@/lib/utils'

function confirmationClientHtml(clientNom: string, numero: string, signatureDate: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#141414;padding:28px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.01em;">HL Rénovation</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#d1fae5;line-height:56px;font-size:28px;">&#10003;</div>
          </div>
          <h2 style="margin:0 0 16px;color:#141414;font-size:18px;text-align:center;font-weight:600;">
            Devis ${numero} confirme
          </h2>
          <p style="margin:0 0 20px;color:#141414;font-size:15px;line-height:1.6;">
            Bonjour${clientNom ? ' ' + clientNom : ''},
          </p>
          <p style="margin:0 0 20px;color:#707070;font-size:14px;line-height:1.6;">
            Nous confirmons la bonne reception de votre signature electronique sur le devis <strong style="color:#141414;">${numero}</strong>, enregistree le ${signatureDate}.
          </p>
          <p style="margin:0 0 20px;color:#707070;font-size:14px;line-height:1.6;">
            Notre equipe va prendre contact avec vous prochainement pour organiser la suite des travaux.
          </p>
          <p style="margin:0 0 0;color:#707070;font-size:14px;line-height:1.6;">
            Merci pour votre confiance !
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #ebebeb;">
          <p style="margin:0;color:#adadad;font-size:11px;line-height:1.5;">
            HL Renovation — Tournai, Belgique<br>
            Cet email a ete envoye automatiquement depuis votre espace facturation.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function notificationInterneHtml(
  clientNom: string,
  numero: string,
  montantTTC: string,
  signatureDate: string,
  signatureIp: string
) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#059669;padding:28px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:600;">Devis signe !</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#141414;font-size:15px;line-height:1.6;font-weight:600;">
            ${clientNom} a signe le devis ${numero}
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
                <span style="color:#9ca3af;font-size:12px;">Date de signature</span><br>
                <span style="color:#141414;font-size:14px;">${signatureDate}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 16px;">
                <span style="color:#9ca3af;font-size:12px;">Adresse IP</span><br>
                <span style="color:#141414;font-size:14px;">${signatureIp}</span>
              </td>
            </tr>
          </table>
          <p style="margin:0;color:#707070;font-size:13px;line-height:1.5;">
            Vous pouvez maintenant convertir ce devis en facture depuis l'application.
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
  const { signature_image, cgv_acceptees } = await request.json()

  if (!signature_image) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  // Use service role to bypass RLS (this is a public endpoint)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find devis by token — fetch more data for emails
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

  // Get IP and user agent for eIDAS traceability
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const now = new Date()
  const signatureDate = new Intl.DateTimeFormat('fr-BE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(now)

  // Update devis with signature
  const { error: updateError } = await supabase
    .from('devis')
    .update({
      statut: 'accepte',
      signature_image,
      signature_ip: ip,
      signature_date: now.toISOString(),
      signature_user_agent: userAgent,
      token_signature: null, // Invalidate token (single use)
      cgv_acceptees: !!cgv_acceptees,
      cgv_acceptees_date: cgv_acceptees ? now.toISOString() : null,
    })
    .eq('id', devis.id)

  if (updateError) {
    return NextResponse.json({ error: 'Erreur de mise a jour' }, { status: 500 })
  }

  // --- Auto-create chantier (statut 'a_planifier') ---
  try {
    // Check if a chantier already exists for this devis
    const { data: existingChantier } = await supabase
      .from('chantiers')
      .select('id')
      .eq('devis_id', devis.id)
      .maybeSingle()

    if (!existingChantier) {
      // Get client info for chantier address
      const { data: clientInfo } = await supabase
        .from('clients')
        .select('adresse, code_postal, ville')
        .eq('id', devis.client_id)
        .single()

      // Get devis title
      const { data: devisDetail } = await supabase
        .from('devis')
        .select('titre, total_ht')
        .eq('id', devis.id)
        .single()

      // Generate numero CHT-YYYY-NNNN
      const { data: numeroData } = await supabase.rpc('generate_numero', {
        p_type: 'CHT',
        p_entreprise_id: devis.entreprise_id,
      })

      await supabase.from('chantiers').insert({
        entreprise_id: devis.entreprise_id,
        devis_id: devis.id,
        client_id: devis.client_id,
        numero: numeroData || `CHT-${new Date().getFullYear()}-TEMP`,
        titre: devisDetail?.titre || devis.numero,
        adresse: clientInfo?.adresse || null,
        code_postal: clientInfo?.code_postal || null,
        ville: clientInfo?.ville || null,
        statut: 'a_planifier',
        budget_ht: devisDetail?.total_ht || 0,
      })
    }
  } catch (chantierErr) {
    // Don't fail the signature because of chantier creation errors
    console.error('Auto-create chantier error:', chantierErr)
  }

  // --- Send emails (fire & forget — don't block signature response) ---
  try {
    // 1. Get client info
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

    // 2. Email de confirmation au client
    if (client?.email) {
      await sendEmail({
        to: [{ email: client.email, name: clientNom }],
        subject: `Devis ${devis.numero} confirme - HL Renovation`,
        htmlContent: confirmationClientHtml(clientNom, devis.numero, signatureDate),
      }).catch((err) => console.error('Email confirmation client failed:', err))
    }

    // 3. Notification interne — envoyer aux super_admin + utilisateurs de l'entreprise
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
          subject: `${clientNom} a signe le devis ${devis.numero}`,
          htmlContent: notificationInterneHtml(
            clientNom,
            devis.numero,
            formatMontant(devis.total_ttc),
            signatureDate,
            ip
          ),
        }).catch((err) => console.error('Email notification interne failed:', err))
      }
    }
  } catch (emailErr) {
    // Don't fail the signature because of email errors
    console.error('Post-signature email error:', emailErr)
  }

  return NextResponse.json({ success: true })
}
