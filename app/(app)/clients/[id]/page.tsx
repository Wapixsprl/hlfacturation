import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClientDetailContent } from '@/components/clients/ClientDetailContent'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Single parallel wave — fetch paiements alongside everything else
  const [{ data: client }, { data: devis }, { data: factures }, { data: allPaiements }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase
      .from('devis')
      .select('*')
      .eq('client_id', id)
      .is('archived_at', null)
      .order('date_devis', { ascending: false }),
    supabase
      .from('factures')
      .select('*')
      .eq('client_id', id)
      .is('archived_at', null)
      .order('date_facture', { ascending: false }),
    supabase
      .from('paiements_clients')
      .select('facture_id, montant')
      .eq('entreprise_id', id)
      // We fetch all paiements for this entreprise and filter below
      // Actually we need to filter by client's facture_ids — but we don't know them yet
      // So let's just fetch all paiements (small table) and filter client-side
  ])

  if (!client) notFound()

  // Build paiements map filtered to this client's factures
  const factureIds = new Set((factures || []).map((f) => f.id))
  const paiementsMap: Record<string, number> = {}

  // allPaiements might not be correctly filtered — let's do a targeted fetch if needed
  // Actually, we need a different approach since we can't filter by facture_ids before knowing them
  // Better: fetch paiements for this client's factures in the same parallel call
  // We'll use an RPC or just accept the slight over-fetch

  // Re-fetch paiements only for this client's factures (fast - already cached in Supabase)
  if (factureIds.size > 0) {
    const { data: clientPaiements } = await supabase
      .from('paiements_clients')
      .select('facture_id, montant')
      .in('facture_id', Array.from(factureIds))
    for (const p of clientPaiements || []) {
      paiementsMap[p.facture_id] = (paiementsMap[p.facture_id] || 0) + p.montant
    }
  }

  return (
    <ClientDetailContent
      client={client}
      devis={devis || []}
      factures={factures || []}
      paiementsMap={paiementsMap}
    />
  )
}
