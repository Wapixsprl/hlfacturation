/**
 * Synchronisation de la boîte de réception Peppol → factures_achat.
 * Multi-provider (e-invoice.be / Let's Peppol), mutualisé entre la sync manuelle
 * et le cron. Renvoie un compteur d'import.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { makePeppolClient, PeppolNotConfiguredError } from '@/lib/peppol/client'
import {
  lpAuthFromEntreprise, lpListNewDocuments, lpMarkDownloaded, LetsPeppolNotConfiguredError,
} from '@/lib/peppol/letspeppol'
import { parseReceivedUbl } from '@/lib/peppol/ubl-parse'
import { importPeppolDocs, type PeppolInboxDoc, type ImportResult } from '@/lib/peppol/inbox-import'

export interface PeppolEntreprise {
  id: string
  peppol_provider?: string | null
  einvoice_api_key_encrypted?: string | null
  letspeppol_email?: string | null
  letspeppol_password_encrypted?: string | null
}

export class PeppolSyncNotConfigured extends Error {
  constructor(msg: string) { super(msg); this.name = 'PeppolSyncNotConfigured' }
}

/**
 * Synchronise l'inbox Peppol d'une entreprise.
 * @throws PeppolSyncNotConfigured si le provider actif n'a pas d'identifiants
 */
export async function syncEntreprisePeppolInbox(
  service: SupabaseClient,
  entreprise: PeppolEntreprise
): Promise<ImportResult & { provider: string }> {
  const provider = entreprise.peppol_provider || 'e_invoice'

  // ── Let's Peppol ──────────────────────────────────────────────────────────
  if (provider === 'letspeppol') {
    let jwt
    try {
      jwt = await lpAuthFromEntreprise(entreprise.letspeppol_email, entreprise.letspeppol_password_encrypted)
    } catch (e) {
      if (e instanceof LetsPeppolNotConfiguredError) {
        throw new PeppolSyncNotConfigured("Identifiants Let's Peppol non configurés (Paramètres > Facturation)")
      }
      throw e
    }

    const raw = await lpListNewDocuments(jwt, 100)
    const incoming = (Array.isArray(raw) ? raw : []).filter(d => d.direction === 'INCOMING')

    const docs: PeppolInboxDoc[] = incoming.map(d => {
      const parsed = parseReceivedUbl(d.ubl || '')
      return {
        externalId: d.id,
        type: parsed.type,
        numero: parsed.numero,
        dateFacture: parsed.dateFacture,
        dateEcheance: parsed.dateEcheance,
        fournisseur: parsed.fournisseur,
        totalHt: parsed.totalHt,
        totalTva: parsed.totalTva,
        totalTtc: parsed.totalTtc,
        pdf: parsed.pdf,
      }
    })

    const res = await importPeppolDocs(service, entreprise.id, docs)

    // Acquitte les documents traités (importés + doublons) pour qu'ils ne
    // réapparaissent plus. Les erreurs restent dans l'inbox → retry au prochain run.
    const toAck = [...res.importedIds, ...res.skippedIds]
    if (toAck.length > 0) {
      try { await lpMarkDownloaded(jwt, toAck) } catch { /* non bloquant */ }
    }

    return { ...res, provider }
  }

  // ── e-invoice.be (défaut) ─────────────────────────────────────────────────
  let client
  try {
    client = makePeppolClient(entreprise.einvoice_api_key_encrypted)
  } catch (e) {
    if (e instanceof PeppolNotConfiguredError) {
      throw new PeppolSyncNotConfigured('Clé API e-invoice.be non configurée (Paramètres > Facturation)')
    }
    throw e
  }

  type EiDoc = {
    id?: string; vendor_name?: string; vendor_tax_id?: string; vendor_address?: string
    vendor_email?: string; invoice_id?: string; invoice_date?: string; due_date?: string
    subtotal?: string | number; total_tax?: string | number; invoice_total?: string | number; note?: string
  }
  const extractList = (res: unknown): EiDoc[] => {
    if (Array.isArray(res)) return res as EiDoc[]
    const r = res as Record<string, unknown>
    for (const key of ['items', 'results', 'data', 'documents', 'invoices']) {
      if (Array.isArray(r?.[key])) return r[key] as EiDoc[]
    }
    return []
  }
  let invoices: EiDoc[] = []
  let creditNotes: EiDoc[] = []
  const invRes = await client.inbox.listInvoices({ page_size: 100 })
  invoices = extractList(invRes)
  const ncRes = await client.inbox.listCreditNotes({ page_size: 100 })
  creditNotes = extractList(ncRes)

  const mapEi = (d: EiDoc, type: 'facture' | 'note_credit'): PeppolInboxDoc => {
    const ttc = Number(d.invoice_total) || 0
    const ht = Number(d.subtotal) || 0
    return {
      externalId: d.id || '',
      type,
      numero: d.invoice_id || null,
      dateFacture: d.invoice_date || new Date().toISOString().split('T')[0],
      dateEcheance: d.due_date || null,
      fournisseur: {
        nom: d.vendor_name || null,
        tva: d.vendor_tax_id || null,
        adresse: d.vendor_address || null,
        email: d.vendor_email || null,
      },
      totalHt: ht,
      totalTva: Number(d.total_tax) || Math.round((ttc - ht) * 100) / 100,
      totalTtc: ttc,
      note: d.note || null,
    }
  }

  const docs: PeppolInboxDoc[] = [
    ...invoices.map(d => mapEi(d, 'facture')),
    ...creditNotes.map(d => mapEi(d, 'note_credit')),
  ]

  const res = await importPeppolDocs(service, entreprise.id, docs)
  return { ...res, provider }
}
