import { createClient } from '@/lib/supabase/server'
import { FacturesPageContent } from '@/components/factures/FacturesPageContent'

export default async function FacturesPage() {
  const supabase = await createClient()

  // Parallel fetch — paiements sans filtre (table petite), join côté JS
  const [{ data: factures }, { data: paiements }, { data: lignesTva }] = await Promise.all([
    supabase
      .from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type)')
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('paiements_clients')
      .select('facture_id, montant'),
    supabase
      .from('factures_lignes')
      .select('facture_id, taux_tva')
      .eq('type', 'produit'),
  ])

  const paiementMap: Record<string, number> = {}
  for (const p of paiements || []) {
    paiementMap[p.facture_id] = (paiementMap[p.facture_id] || 0) + p.montant
  }

  const tvaMap: Record<string, number[]> = {}
  for (const l of lignesTva || []) {
    if (!tvaMap[l.facture_id]) tvaMap[l.facture_id] = []
    if (!tvaMap[l.facture_id].includes(l.taux_tva)) tvaMap[l.facture_id].push(l.taux_tva)
  }
  for (const id of Object.keys(tvaMap)) tvaMap[id].sort((a, b) => a - b)

  const facturesWithPaye = (factures || []).map((f) => ({
    ...f,
    total_paye: paiementMap[f.id] || 0,
    taux_tva_list: tvaMap[f.id] || [],
  }))

  return <FacturesPageContent initialFactures={facturesWithPaye} initialTvaMap={tvaMap} />
}
