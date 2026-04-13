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

  // Vague 1 — client, devis et factures en parallèle
  const [{ data: client }, { data: devis }, { data: factures }] = await Promise.all([
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
  ])

  if (!client) notFound()

  // Vague 2 — paiements filtrés par les factures du client (nécessite les IDs de la vague 1)
  const factureIds = (factures || []).map((f) => f.id)
  const paiementsMap: Record<string, number> = {}

  if (factureIds.length > 0) {
    const { data: clientPaiements } = await supabase
      .from('paiements_clients')
      .select('facture_id, montant')
      .in('facture_id', factureIds)
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
