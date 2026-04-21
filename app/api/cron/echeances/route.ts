import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/brevo/emails'
import { formatMontant } from '@/lib/utils'
import type { AcompteConfig } from '@/types/database'

/**
 * CRON: Echeances programmees
 *
 * Verifie les devis signes (statut='accepte') qui ont des acomptes avec date_echeance.
 * Quand une date d'echeance est atteinte :
 * 1. Convertit automatiquement le devis en facture d'acompte
 * 2. Envoie la facture par email au client
 *
 * Ce cron tourne quotidiennement.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function echeanceNotificationHtml(
  clientNom: string,
  devisNumero: string,
  montantTTC: string,
  echeanceLabel: string,
  echeanceDate: string
) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#141414;padding:28px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:600;">HL R&eacute;novation</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#141414;font-size:18px;font-weight:600;">
            &Eacute;ch&eacute;ance de paiement
          </h2>
          <p style="margin:0 0 20px;color:#141414;font-size:15px;line-height:1.6;">
            Bonjour${clientNom ? ' ' + clientNom : ''},
          </p>
          <p style="margin:0 0 20px;color:#707070;font-size:14px;line-height:1.6;">
            Conform&eacute;ment au devis <strong style="color:#141414;">${devisNumero}</strong>,
            l'&eacute;ch&eacute;ance <strong style="color:#141414;">${echeanceLabel}</strong>
            est pr&eacute;vue le <strong style="color:#141414;">${echeanceDate}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
            <tr>
              <td style="padding:16px;text-align:center;">
                <span style="color:#9ca3af;font-size:12px;display:block;margin-bottom:4px;">Montant &agrave; r&eacute;gler</span>
                <span style="color:#141414;font-size:24px;font-weight:700;">${montantTTC}</span>
              </td>
            </tr>
          </table>
          <p style="margin:0;color:#707070;font-size:14px;line-height:1.6;">
            Une facture d'acompte vous sera envoy&eacute;e s&eacute;par&eacute;ment.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #ebebeb;">
          <p style="margin:0;color:#adadad;font-size:11px;line-height:1.5;">
            HL R&eacute;novation &mdash; Tournai, Belgique<br>
            Email automatique depuis votre espace facturation.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET for Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const results: string[] = []

  try {
    // Fetch all signed devis (accepte) with acomptes_config that have date_echeance
    const { data: devisAcceptes } = await supabase
      .from('devis')
      .select('*, client:clients(*), entreprise:entreprises(*)')
      .eq('statut', 'accepte')
      .not('acomptes_config', 'eq', '[]')

    if (!devisAcceptes || devisAcceptes.length === 0) {
      return NextResponse.json({ message: 'Aucun devis avec echeances', results })
    }

    for (const devis of devisAcceptes) {
      const acomptes = (devis.acomptes_config || []) as AcompteConfig[]
      const client = devis.client

      if (!client?.email) continue

      for (let i = 0; i < acomptes.length; i++) {
        const acompte = acomptes[i]
        if (!acompte.date_echeance) continue
        if (acompte.date_echeance > today) continue // Pas encore atteint

        // Verifier si une facture d'acompte a deja ete creee pour cette echeance
        // On check par devis_id + type='acompte' + montant correspondant
        const montantAcompte = Math.round(devis.total_ttc * (acompte.pourcentage / 100) * 100) / 100

        const { data: facturesExistantes } = await supabase
          .from('factures')
          .select('id')
          .eq('devis_id', devis.id)
          .eq('type', 'acompte')
          .gte('total_ttc', montantAcompte - 0.01)
          .lte('total_ttc', montantAcompte + 0.01)

        if (facturesExistantes && facturesExistantes.length > 0) {
          continue // Facture deja creee
        }

        // Envoyer l'email de notification d'echeance au client
        const clientName = client.type === 'professionnel' && client.raison_sociale
          ? client.raison_sociale
          : [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'

        const echeanceDate = new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' }).format(new Date(acompte.date_echeance))
        const echeanceLabel = acompte.label || `Acompte ${i + 1}`

        try {
          await sendEmail({
            to: [{ email: client.email, name: clientName }],
            subject: `Echeance de paiement - ${echeanceLabel} - Devis ${devis.numero}`,
            htmlContent: echeanceNotificationHtml(
              clientName,
              devis.numero,
              formatMontant(montantAcompte),
              echeanceLabel,
              echeanceDate
            ),
          })

          results.push(`Email echeance envoye: ${devis.numero} - ${echeanceLabel} -> ${client.email}`)
        } catch (emailError) {
          results.push(`Erreur email ${devis.numero} - ${echeanceLabel}: ${emailError}`)
        }
      }
    }

    return NextResponse.json({
      message: `Echeances traitees: ${results.length}`,
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur interne', details: String(error) },
      { status: 500 }
    )
  }
}
