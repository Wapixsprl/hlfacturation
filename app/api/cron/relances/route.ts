import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/brevo/emails'
import { formatMontant, getAppUrl } from '@/lib/utils'
import type { RelancesConfig, RelanceTypeConfig } from '@/types/database'
import { DEFAULT_RELANCES_CONFIG, DEFAULT_RELANCE_EMAILS } from '@/types/database'

// Service role — bypasses RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- Variable substitution ---

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

// --- Generic HTML wrapper for relance emails ---

function relanceEmailHtml(
  headerLabel: string,
  headerColor: string,
  bodyText: string,
  ctaBlock?: string
) {
  // Convert plain text body to HTML paragraphs
  const bodyHtml = bodyText
    .split('\n\n')
    .filter((p) => p.trim())
    .map((p) => `<p style="margin:0 0 20px;color:#707070;font-size:14px;line-height:1.6;">${p.trim()}</p>`)
    .join('\n          ')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:${headerColor};padding:28px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:600;">${headerLabel}</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyHtml}
          ${ctaBlock || ''}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #ebebeb;">
          <p style="margin:0;color:#adadad;font-size:11px;line-height:1.5;">
            HL Renovation — Tournai, Belgique<br>
            Rappel automatique envoye depuis votre espace facturation.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function getHeaderColor(etapeIndex: number): string {
  return etapeIndex >= 2 ? '#DC2626' : etapeIndex === 1 ? '#EA580C' : '#D97706'
}

function getUrgenceLabel(etapeIndex: number, prefix: string): string {
  return etapeIndex >= 2 ? `Dernier rappel — ${prefix}` : etapeIndex === 1 ? `2e rappel — ${prefix}` : `Rappel — ${prefix}`
}

// --- Helpers ---

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d: string): string {
  return new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' }).format(new Date(d))
}

// Check espacement minimum between relances
function respectsEspacement(derniereRelance: string | null, now: Date, espacementJours: number): boolean {
  if (!derniereRelance) return true
  return daysBetween(new Date(derniereRelance), now) >= espacementJours
}

// For devis: check if we should send based on jours avant expiration
function shouldRelanceDevis(
  nbRelances: number,
  config: RelanceTypeConfig,
  joursAvantExpiration: number
): boolean {
  const enabledEtapes = config.etapes.filter((e) => e.enabled)
  if (nbRelances >= enabledEtapes.length) return false
  const etape = enabledEtapes[nbRelances]
  if (!etape) return false
  // For devis: jours = days before expiry. Trigger when remaining days <= jours
  return joursAvantExpiration <= etape.jours
}

// For factures: check if we should send based on jours apres echeance
function shouldRelanceFacture(
  nbRelances: number,
  config: RelanceTypeConfig,
  joursRetard: number
): boolean {
  const enabledEtapes = config.etapes.filter((e) => e.enabled)
  if (nbRelances >= enabledEtapes.length) return false
  const etape = enabledEtapes[nbRelances]
  if (!etape) return false
  return joursRetard >= etape.jours
}

// --- Main handler ---

export async function GET(request: NextRequest) {
  // Verify authorization — Vercel Cron sends CRON_SECRET header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const now = new Date()
  const results = { devisRelances: 0, factureRelances: 0, factureAchatRelances: 0, errors: 0 }

  // ============================================================
  // 0. LOAD CONFIG — fetch entreprise relances config
  // ============================================================
  const { data: entreprises } = await supabase
    .from('entreprises')
    .select('id, relances_config, email')

  if (!entreprises || entreprises.length === 0) {
    return NextResponse.json({ success: true, message: 'Aucune entreprise trouvee', ...results })
  }

  // Use first entreprise (single-tenant)
  const entreprise = entreprises[0]
  const config: RelancesConfig = (entreprise.relances_config as RelancesConfig) || DEFAULT_RELANCES_CONFIG

  // ============================================================
  // 1. RELANCE DEVIS — devis "envoye" with approaching expiry
  // ============================================================
  if (config.devis.enabled && config.devis.etapes.some((e) => e.enabled)) {
    try {
      const maxEtapes = config.devis.etapes.filter((e) => e.enabled).length

      const { data: devisEnvoyes } = await supabase
        .from('devis')
        .select('id, numero, date_validite, total_ttc, client_id, token_signature, nb_relances, derniere_relance')
        .eq('statut', 'envoye')
        .is('archived_at', null)
        .not('date_validite', 'is', null)
        .lt('nb_relances', maxEtapes)

      const devisToRelance = (devisEnvoyes || []).filter((devis) => {
        const joursAvantExpiration = daysBetween(now, new Date(devis.date_validite))
        return (
          shouldRelanceDevis(devis.nb_relances, config.devis, joursAvantExpiration) &&
          respectsEspacement(devis.derniere_relance, now, config.devis.espacement_minimum_jours)
        )
      })

      // Batch fetch clients
      const devisClientIds = [...new Set(devisToRelance.map((d) => d.client_id))]
      const clientsMap: Record<string, { email: string | null; nom: string | null; prenom: string | null; raison_sociale: string | null; type: string | null }> = {}
      if (devisClientIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, email, nom, prenom, raison_sociale, type')
          .in('id', devisClientIds)
        for (const c of clients || []) {
          clientsMap[c.id] = c
        }
      }

      for (const devis of devisToRelance) {
        try {
          const client = clientsMap[devis.client_id]
          if (!client?.email) continue

          const clientNom =
            client.type === 'professionnel' && client.raison_sociale
              ? client.raison_sociale
              : [client.prenom, client.nom].filter(Boolean).join(' ')

          const lienSignature = devis.token_signature
            ? `${getAppUrl()}/signer/${devis.token_signature}`
            : null

          const devisVars = {
            client: clientNom,
            numero: devis.numero,
            montant: formatMontant(devis.total_ttc),
            date_validite: fmtDate(devis.date_validite),
          }

          const devisSubject = replaceVariables(
            config.devis.objet_email || DEFAULT_RELANCE_EMAILS.devis.objet,
            devisVars
          )
          const devisBody = replaceVariables(
            config.devis.contenu_email || DEFAULT_RELANCE_EMAILS.devis.contenu,
            devisVars
          )

          const ctaBlock = lienSignature
            ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr><td align="center">
                  <a href="${lienSignature}" style="display:inline-block;background:#141414;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">
                    Consulter et signer le devis
                  </a>
                </td></tr>
              </table>`
            : undefined

          await sendEmail({
            to: [{ email: client.email, name: clientNom }],
            subject: devisSubject,
            htmlContent: relanceEmailHtml(
              getUrgenceLabel(devis.nb_relances, `Devis ${devis.numero}`),
              getHeaderColor(devis.nb_relances),
              devisBody,
              ctaBlock
            ),
          })

          await supabase
            .from('devis')
            .update({
              nb_relances: devis.nb_relances + 1,
              derniere_relance: now.toISOString(),
            })
            .eq('id', devis.id)

          results.devisRelances++
        } catch (err) {
          console.error(`Relance devis ${devis.id} error:`, err)
          results.errors++
        }
      }
    } catch (err) {
      console.error('Devis relance query error:', err)
      results.errors++
    }
  }

  // ============================================================
  // 2. RELANCE FACTURES VENTE — factures impayees past due date
  // ============================================================
  if (config.factures_vente.enabled && config.factures_vente.etapes.some((e) => e.enabled)) {
    try {
      const maxEtapes = config.factures_vente.etapes.filter((e) => e.enabled).length

      const { data: facturesImpayees } = await supabase
        .from('factures')
        .select('id, numero, date_echeance, total_ttc, solde_ttc, client_id, nb_relances, derniere_relance')
        .in('statut', ['envoyee', 'partiellement_payee', 'en_retard'])
        .is('archived_at', null)
        .not('date_echeance', 'is', null)
        .lt('nb_relances', maxEtapes)

      const facturesToRelance = (facturesImpayees || []).filter((facture) => {
        const joursRetard = daysBetween(new Date(facture.date_echeance), now)
        if (joursRetard < 1) return false
        return (
          shouldRelanceFacture(facture.nb_relances, config.factures_vente, joursRetard) &&
          respectsEspacement(facture.derniere_relance, now, config.factures_vente.espacement_minimum_jours)
        )
      })

      // Batch fetch clients
      const factureClientIds = [...new Set(facturesToRelance.map((f) => f.client_id))]
      const factureClientsMap: Record<string, { email: string | null; nom: string | null; prenom: string | null; raison_sociale: string | null; type: string | null }> = {}
      if (factureClientIds.length > 0) {
        const { data: fClients } = await supabase
          .from('clients')
          .select('id, email, nom, prenom, raison_sociale, type')
          .in('id', factureClientIds)
        for (const c of fClients || []) {
          factureClientsMap[c.id] = c
        }
      }

      for (const facture of facturesToRelance) {
        try {
          const joursRetard = daysBetween(new Date(facture.date_echeance), now)
          const client = factureClientsMap[facture.client_id]
          if (!client?.email) continue

          const clientNom =
            client.type === 'professionnel' && client.raison_sociale
              ? client.raison_sociale
              : [client.prenom, client.nom].filter(Boolean).join(' ')

          const montantRestant = facture.solde_ttc || facture.total_ttc

          const factureVars = {
            client: clientNom,
            numero: facture.numero,
            montant: formatMontant(montantRestant),
            date_echeance: fmtDate(facture.date_echeance),
            jours_retard: String(joursRetard),
          }

          const factureSubject = replaceVariables(
            config.factures_vente.objet_email || DEFAULT_RELANCE_EMAILS.factures_vente.objet,
            factureVars
          )
          const factureBody = replaceVariables(
            config.factures_vente.contenu_email || DEFAULT_RELANCE_EMAILS.factures_vente.contenu,
            factureVars
          )

          await sendEmail({
            to: [{ email: client.email, name: clientNom }],
            subject: factureSubject,
            htmlContent: relanceEmailHtml(
              getUrgenceLabel(facture.nb_relances, `Facture ${facture.numero}`),
              getHeaderColor(facture.nb_relances),
              factureBody
            ),
          })

          const updates: Record<string, unknown> = {
            nb_relances: facture.nb_relances + 1,
            derniere_relance: now.toISOString(),
          }
          if (facture.nb_relances === 0) {
            updates.statut = 'en_retard'
          }

          await supabase
            .from('factures')
            .update(updates)
            .eq('id', facture.id)

          results.factureRelances++
        } catch (err) {
          console.error(`Relance facture ${facture.id} error:`, err)
          results.errors++
        }
      }
    } catch (err) {
      console.error('Facture relance query error:', err)
      results.errors++
    }
  }

  // ============================================================
  // 3. RELANCE FACTURES ACHAT — rappels internes échéances fournisseurs
  // ============================================================
  if (config.factures_achat.enabled && config.factures_achat.etapes.some((e) => e.enabled)) {
    // Send reminders to the entreprise email (internal reminders)
    const entrepriseEmail = entreprise.email
    if (entrepriseEmail) {
      try {
        const maxEtapes = config.factures_achat.etapes.filter((e) => e.enabled).length

        // Get factures achat with unpaid echeances past due
        const { data: facturesAchat } = await supabase
          .from('factures_achat')
          .select('id, numero_fournisseur, total_ttc, fournisseur_id, nb_relances, derniere_relance')
          .in('statut', ['a_payer', 'en_retard'])
          .is('archived_at', null)
          .lt('nb_relances', maxEtapes)

        // Get unpaid echeances for these factures
        const factureAchatIds = (facturesAchat || []).map((f) => f.id)
        const echeancesMap: Record<string, { date_echeance: string; montant: number }[]> = {}

        if (factureAchatIds.length > 0) {
          const { data: echeances } = await supabase
            .from('echeances_fournisseurs')
            .select('facture_achat_id, date_echeance, montant')
            .in('facture_achat_id', factureAchatIds)
            .in('statut', ['a_payer', 'en_retard'])

          for (const e of echeances || []) {
            if (!echeancesMap[e.facture_achat_id]) echeancesMap[e.facture_achat_id] = []
            echeancesMap[e.facture_achat_id].push(e)
          }
        }

        const facturesAchatToRelance = (facturesAchat || []).filter((fa) => {
          const echeances = echeancesMap[fa.id]
          if (!echeances || echeances.length === 0) return false
          // Check the earliest unpaid echeance
          const earliestEcheance = echeances.reduce((min, e) =>
            new Date(e.date_echeance) < new Date(min.date_echeance) ? e : min
          )
          const joursRetard = daysBetween(new Date(earliestEcheance.date_echeance), now)
          if (joursRetard < 1) return false
          return (
            shouldRelanceFacture(fa.nb_relances, config.factures_achat, joursRetard) &&
            respectsEspacement(fa.derniere_relance, now, config.factures_achat.espacement_minimum_jours)
          )
        })

        // Batch fetch fournisseurs
        const fournisseurIds = [...new Set(facturesAchatToRelance.map((f) => f.fournisseur_id))]
        const fournisseursMap: Record<string, { raison_sociale: string }> = {}
        if (fournisseurIds.length > 0) {
          const { data: fournisseurs } = await supabase
            .from('fournisseurs')
            .select('id, raison_sociale')
            .in('id', fournisseurIds)
          for (const f of fournisseurs || []) {
            fournisseursMap[f.id] = f
          }
        }

        for (const fa of facturesAchatToRelance) {
          try {
            const fournisseur = fournisseursMap[fa.fournisseur_id]
            const echeances = echeancesMap[fa.id]
            const earliestEcheance = echeances.reduce((min, e) =>
              new Date(e.date_echeance) < new Date(min.date_echeance) ? e : min
            )
            const joursRetard = daysBetween(new Date(earliestEcheance.date_echeance), now)
            const montantDu = echeances.reduce((sum, e) => sum + e.montant, 0)
            const numero = fa.numero_fournisseur || `FA-${fa.id.slice(0, 8)}`

            const faVars = {
              fournisseur: fournisseur?.raison_sociale || 'Fournisseur inconnu',
              numero,
              montant: formatMontant(montantDu),
              date_echeance: fmtDate(earliestEcheance.date_echeance),
              jours_retard: String(joursRetard),
            }

            const faSubject = replaceVariables(
              config.factures_achat.objet_email || DEFAULT_RELANCE_EMAILS.factures_achat.objet,
              faVars
            )
            const faBody = replaceVariables(
              config.factures_achat.contenu_email || DEFAULT_RELANCE_EMAILS.factures_achat.contenu,
              faVars
            )

            await sendEmail({
              to: [{ email: entrepriseEmail, name: 'HL Renovation' }],
              subject: faSubject,
              htmlContent: relanceEmailHtml(
                getUrgenceLabel(fa.nb_relances, `Facture fournisseur ${numero}`),
                getHeaderColor(fa.nb_relances),
                faBody
              ),
            })

            const updates: Record<string, unknown> = {
              nb_relances: fa.nb_relances + 1,
              derniere_relance: now.toISOString(),
            }
            if (fa.nb_relances === 0) {
              updates.statut = 'en_retard'
            }

            await supabase
              .from('factures_achat')
              .update(updates)
              .eq('id', fa.id)

            results.factureAchatRelances++
          } catch (err) {
            console.error(`Relance facture achat ${fa.id} error:`, err)
            results.errors++
          }
        }
      } catch (err) {
        console.error('Facture achat relance query error:', err)
        results.errors++
      }
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    ...results,
  })
}
