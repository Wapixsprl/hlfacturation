import { getAppUrl } from '@/lib/utils'

const BREVO_API_KEY = process.env.BREVO_API_KEY!
const BREVO_EXPEDITEUR_EMAIL = process.env.BREVO_EXPEDITEUR_EMAIL || 'hlfacturation@wapix.io'
const BREVO_EXPEDITEUR_NOM = process.env.BREVO_EXPEDITEUR_NOM || 'HL Rénovation'

interface SendEmailParams {
  to: { email: string; name?: string }[]
  templateId?: number
  subject?: string
  htmlContent?: string
  params?: Record<string, string | number>
  attachments?: { name: string; url: string }[]
}

export async function sendEmail({ to, templateId, subject, htmlContent, params, attachments }: SendEmailParams) {
  const body: Record<string, unknown> = {
    sender: { email: BREVO_EXPEDITEUR_EMAIL, name: BREVO_EXPEDITEUR_NOM },
    to,
    attachment: attachments?.map(a => ({ name: a.name, url: a.url })),
  }

  if (templateId) {
    body.templateId = templateId
    body.params = params
  } else {
    body.subject = subject
    body.htmlContent = htmlContent
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Brevo email error: ${JSON.stringify(error)}`)
  }

  return response.json()
}

function devisEmailHtml(clientNom: string, numero: string, lienSignature: string, trackingUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#141414;padding:28px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.01em;">HL Rénovation</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#141414;font-size:15px;line-height:1.6;">
            Bonjour${clientNom ? ' ' + clientNom : ''},
          </p>
          <p style="margin:0 0 20px;color:#707070;font-size:14px;line-height:1.6;">
            Veuillez trouver ci-joint votre devis <strong style="color:#141414;">${numero}</strong>.
          </p>
          <p style="margin:0 0 24px;color:#707070;font-size:14px;line-height:1.6;">
            Vous pouvez consulter et signer ce devis en ligne en cliquant sur le bouton ci-dessous :
          </p>
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${lienSignature}" style="display:inline-block;background:#141414;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">
                Consulter et signer le devis
              </a>
            </td></tr>
          </table>
          <p style="margin:28px 0 0;color:#adadad;font-size:12px;line-height:1.5;">
            Ce lien est valide pendant 30 jours. Le PDF du devis est également joint à cet email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #ebebeb;">
          <p style="margin:0;color:#adadad;font-size:11px;line-height:1.5;">
            HL Rénovation — Tournai, Belgique<br>
            Cet email a été envoyé automatiquement depuis votre espace facturation.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`
}

function factureEmailHtml(clientNom: string, numero: string, montantTTC: string, trackingUrl: string, viewUrl: string, paymentUrl?: string) {
  const paymentSection = paymentUrl ? `
          <hr style="border:none;border-top:1px solid #ebebeb;margin:24px 0;" />
          <!-- Payment CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
            <tr><td align="center">
              <a href="${paymentUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:999px;font-size:15px;font-weight:600;">
                Payer ${montantTTC} en ligne
              </a>
            </td></tr>
          </table>
          <p style="margin:8px 0 0;color:#adadad;font-size:12px;line-height:1.5;text-align:center;">
            Paiement s&eacute;curis&eacute; par carte bancaire ou Bancontact
          </p>
          <p style="margin:16px 0 0;color:#707070;font-size:13px;line-height:1.6;">
            Vous pouvez &eacute;galement effectuer votre r&egrave;glement par virement selon les conditions indiqu&eacute;es sur la facture.
          </p>` : `
          <p style="margin:16px 0 0;color:#707070;font-size:14px;line-height:1.6;">
            Merci de proc&eacute;der au r&egrave;glement selon les conditions indiqu&eacute;es sur la facture.
          </p>`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#141414;padding:28px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.01em;">HL R&eacute;novation</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 20px;color:#141414;font-size:15px;line-height:1.6;">
            Bonjour${clientNom ? ' ' + clientNom : ''},
          </p>
          <p style="margin:0 0 24px;color:#707070;font-size:14px;line-height:1.6;">
            Veuillez trouver ci-joint votre facture <strong style="color:#141414;">${numero}</strong>
            d&apos;un montant de <strong style="color:#141414;">${montantTTC}</strong>.
          </p>
          <!-- Voir la facture CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${viewUrl}" style="display:inline-block;background:#141414;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">
                Voir la facture
              </a>
            </td></tr>
          </table>
          ${paymentSection}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #ebebeb;">
          <p style="margin:0;color:#adadad;font-size:11px;line-height:1.5;">
            HL R&eacute;novation &mdash; Tournai, Belgique<br>
            Cet email a &eacute;t&eacute; envoy&eacute; automatiquement depuis votre espace facturation.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  <img src="${trackingUrl}" width="1" height="1" border="0" alt="" style="display:block;width:1px;height:1px;border:0;" />
</body>
</html>`
}

export async function envoyerDevis(email: string, clientNom: string, numero: string, pdfUrl: string, lienSignature: string, devisId: string) {
  const trackingUrl = `${getAppUrl()}/api/devis/${devisId}/track`

  // Always use our HTML with tracking pixel — Brevo templates don't include it
  return sendEmail({
    to: [{ email, name: clientNom }],
    subject: `Votre devis ${numero} — HL Rénovation`,
    htmlContent: devisEmailHtml(clientNom, numero, lienSignature, trackingUrl),
    attachments: [{ name: `${numero}.pdf`, url: pdfUrl }],
  })
}

export async function envoyerFacture(email: string, clientNom: string, numero: string, pdfUrl: string, montantTTC: string, factureId: string, paymentUrl?: string, viewUrl?: string) {
  const trackingUrl = `${getAppUrl()}/api/factures/${factureId}/track`
  const resolvedViewUrl = viewUrl || pdfUrl

  // Always use our HTML with tracking pixel — Brevo templates don't include it
  return sendEmail({
    to: [{ email, name: clientNom }],
    subject: `Facture ${numero} — HL Rénovation`,
    htmlContent: factureEmailHtml(clientNom, numero, montantTTC, trackingUrl, resolvedViewUrl, paymentUrl),
    attachments: [{ name: `${numero}.pdf`, url: pdfUrl }],
  })
}
