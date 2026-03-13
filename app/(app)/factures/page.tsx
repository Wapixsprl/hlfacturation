import { createClient } from '@/lib/supabase/server'
import { FacturesPageContent } from '@/components/factures/FacturesPageContent'

export default async function FacturesPage() {
  const supabase = await createClient()
  const { data: factures } = await supabase
    .from('factures')
    .select('*, client:clients(nom, prenom, raison_sociale, type)')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  // Fetch paiements for computing "reste a payer"
  const factureIds = (factures || []).map((f) => f.id)
  let paiementMap: Record<string, number> = {}
  if (factureIds.length > 0) {
    const { data: paiements } = await supabase
      .from('paiements_clients')
      .select('facture_id, montant')
      .in('facture_id', factureIds)
    for (const p of paiements || []) {
      paiementMap[p.facture_id] = (paiementMap[p.facture_id] || 0) + p.montant
    }
  }

  const facturesWithPaye = (factures || []).map((f) => ({
    ...f,
    total_paye: paiementMap[f.id] || 0,
  }))

  return <FacturesPageContent initialFactures={facturesWithPaye} />
}
