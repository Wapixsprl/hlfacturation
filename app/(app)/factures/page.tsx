import { createClient } from '@/lib/supabase/server'
import { FacturesPageContent } from '@/components/factures/FacturesPageContent'

export default async function FacturesPage() {
  const supabase = await createClient()

  // Parallel fetch — paiements sans filtre (table petite), join côté JS
  const [{ data: factures }, { data: paiements }] = await Promise.all([
    supabase
      .from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type)')
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('paiements_clients')
      .select('facture_id, montant'),
  ])

  const paiementMap: Record<string, number> = {}
  for (const p of paiements || []) {
    paiementMap[p.facture_id] = (paiementMap[p.facture_id] || 0) + p.montant
  }

  const facturesWithPaye = (factures || []).map((f) => ({
    ...f,
    total_paye: paiementMap[f.id] || 0,
  }))

  return <FacturesPageContent initialFactures={facturesWithPaye} />
}
