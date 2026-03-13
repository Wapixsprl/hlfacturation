import { createClient } from '@/lib/supabase/server'
import { ClientsPageContent } from '@/components/clients/ClientsPageContent'

export default async function ClientsPage() {
  const supabase = await createClient()
  // Parallelize ALL queries — avoid N+1
  const [{ data: clients }, { data: factures }, { data: devisAll }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('factures')
      .select('id, client_id, type, statut, total_ttc, solde_ttc')
      .is('archived_at', null),
    // Single query for both statuses instead of 2 separate queries
    supabase
      .from('devis')
      .select('client_id, date_devis, statut')
      .in('statut', ['accepte', 'envoye'])
      .is('archived_at', null)
      .order('date_devis', { ascending: false }),
  ])

  // Build devis maps from single query
  const devisAccepteMap: Record<string, string> = {}
  const devisEnvoyeMap: Record<string, string> = {}

  for (const d of devisAll || []) {
    if (d.statut === 'accepte' && !devisAccepteMap[d.client_id]) {
      devisAccepteMap[d.client_id] = d.date_devis
    }
    if (d.statut === 'envoye' && !devisEnvoyeMap[d.client_id]) {
      devisEnvoyeMap[d.client_id] = d.date_devis
    }
  }

  // Compute per-client financial summary from factures
  const clientFacturesMap: Record<string, { ca: number; paye: number; en_souffrance: number }> = {}
  for (const f of factures || []) {
    if (!clientFacturesMap[f.client_id]) {
      clientFacturesMap[f.client_id] = { ca: 0, paye: 0, en_souffrance: 0 }
    }
    const entry = clientFacturesMap[f.client_id]
    if (f.type !== 'avoir') {
      entry.ca += f.total_ttc
    } else {
      entry.ca -= f.total_ttc
    }
    if (f.statut === 'payee') {
      entry.paye += f.total_ttc
    } else if (f.statut === 'en_retard' || f.statut === 'envoyee' || f.statut === 'partiellement_payee') {
      entry.en_souffrance += f.solde_ttc || f.total_ttc
    }
  }

  const clientsWithDevis = (clients || []).map((c) => ({
    ...c,
    dernier_devis_accepte: devisAccepteMap[c.id] || null,
    dernier_devis_envoye: devisEnvoyeMap[c.id] || null,
    ca_total: clientFacturesMap[c.id]?.ca || 0,
    total_paye: clientFacturesMap[c.id]?.paye || 0,
    total_en_souffrance: clientFacturesMap[c.id]?.en_souffrance || 0,
  }))

  return <ClientsPageContent initialClients={clientsWithDevis} />
}
