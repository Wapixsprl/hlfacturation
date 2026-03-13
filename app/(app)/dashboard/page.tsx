import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() // 0-indexed
  const startOfYear = `${currentYear}-01-01`
  const startOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
  const endOfMonth = currentMonth === 11
    ? `${currentYear + 1}-01-01`
    : `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`

  // Single parallel wave — ALL queries at once (no sequential dependency)
  const [
    { count: clientsCount },
    { data: devisData },
    { data: facturesData },
    { data: recentDevis },
    { data: facturesAnnee },
    { data: objectifData },
    { data: recentFactures },
    { data: allPaiements },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).is('archived_at', null),
    supabase.from('devis').select('statut, total_ttc').is('archived_at', null),
    supabase.from('factures').select('id, statut, total_ttc, solde_ttc').is('archived_at', null),
    supabase.from('devis').select('*, client:clients(nom, prenom, raison_sociale, type)').is('archived_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('factures')
      .select('date_facture, total_ht, statut')
      .is('archived_at', null)
      .gte('date_facture', startOfYear)
      .lt('date_facture', `${currentYear + 1}-01-01`)
      .in('statut', ['payee', 'partiellement_payee', 'envoyee', 'en_retard']),
    supabase.from('objectifs_ca')
      .select('montant')
      .eq('annee', currentYear)
      .maybeSingle(),
    supabase.from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type)')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    // Fetch ALL paiements in one query (eliminates 2nd sequential wave)
    supabase.from('paiements_clients')
      .select('facture_id, montant'),
  ])

  // Build global paiement map
  const paiementMap: Record<string, number> = {}
  for (const p of allPaiements || []) {
    paiementMap[p.facture_id] = (paiementMap[p.facture_id] || 0) + p.montant
  }

  // Compute real impaye
  const facturesNonPayees = (facturesData || []).filter(f =>
    ['envoyee', 'partiellement_payee', 'en_retard'].includes(f.statut)
  )
  const montantImpaye = facturesNonPayees.reduce((sum, f) => {
    const paye = paiementMap[f.id] || 0
    const reste = Math.max(0, (f.solde_ttc || 0) - paye)
    return sum + reste
  }, 0)

  const stats = {
    clients: clientsCount || 0,
    devisEnCours: devisData?.filter(d => ['brouillon', 'envoye'].includes(d.statut)).length || 0,
    devisAcceptes: devisData?.filter(d => d.statut === 'accepte').length || 0,
    caDevis: devisData?.filter(d => d.statut === 'accepte').reduce((sum, d) => sum + (d.total_ttc || 0), 0) || 0,
    facturesEnAttente: facturesNonPayees.length,
    facturesImpayees: Math.round(montantImpaye * 100) / 100,
  }

  const caMensuel = (facturesAnnee || [])
    .filter(f => f.date_facture >= startOfMonth && f.date_facture < endOfMonth)
    .reduce((sum, f) => sum + (f.total_ht || 0), 0)

  const caAnnuel = (facturesAnnee || [])
    .reduce((sum, f) => sum + (f.total_ht || 0), 0)

  const caMoisParMois: number[] = Array(12).fill(0)
  for (const f of facturesAnnee || []) {
    const month = new Date(f.date_facture).getMonth()
    caMoisParMois[month] += f.total_ht || 0
  }

  return (
    <DashboardContent
      stats={stats}
      recentDevis={recentDevis || []}
      recentFactures={(recentFactures || []).map(f => ({
        ...f,
        total_paye: paiementMap[f.id] || 0,
      }))}
      caMensuel={caMensuel}
      caAnnuel={caAnnuel}
      objectifAnnuel={objectifData?.montant || null}
      caMoisParMois={caMoisParMois}
      currentYear={currentYear}
    />
  )
}
