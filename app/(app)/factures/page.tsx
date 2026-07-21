import { createClient } from '@/lib/supabase/server'
import { FacturesPageContent } from '@/components/factures/FacturesPageContent'
import { getPageAccess } from '@/lib/auth/getPageAccess'

export default async function FacturesPage() {
  const [supabase, access] = await Promise.all([
    createClient(),
    getPageAccess(),
  ])
  const canViewDashboard = !access || access.role === 'super_admin' || access.pageAccess.includes('dashboard')

  // Parallel fetch — paiements sans filtre (table petite), join côté JS
  const [{ data: factures }, { data: paiements }, { data: lignesTva }, { data: avoirs }] = await Promise.all([
    supabase
      .from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type), devis:devis(titre, reference_chantier)')
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('paiements_clients')
      .select('facture_id, montant'),
    supabase
      .from('factures_lignes')
      .select('facture_id, taux_tva')
      .eq('type', 'produit'),
    supabase
      .from('factures')
      .select('facture_origine_id, total_ttc')
      .eq('type', 'avoir')
      .not('facture_origine_id', 'is', null),
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

  const avoirMap: Record<string, number> = {}
  for (const a of avoirs || []) {
    if (a.facture_origine_id) {
      avoirMap[a.facture_origine_id] = (avoirMap[a.facture_origine_id] || 0) + Number(a.total_ttc)
    }
  }

  const facturesWithPaye = (factures || []).map((f) => ({
    ...f,
    total_paye: paiementMap[f.id] || 0,
    taux_tva_list: tvaMap[f.id] || [],
    avoir_deduit_ttc: avoirMap[f.id] || 0,
  }))

  return <FacturesPageContent initialFactures={facturesWithPaye} initialTvaMap={tvaMap} canViewDashboard={canViewDashboard} />
}
