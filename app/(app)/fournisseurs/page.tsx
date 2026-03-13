import { createClient } from '@/lib/supabase/server'
import { FournisseursPageContent } from '@/components/fournisseurs/FournisseursPageContent'

export default async function FournisseursPage() {
  const supabase = await createClient()
  const [
    { data: fournisseurs },
    { data: facturesAchat },
  ] = await Promise.all([
    supabase
      .from('fournisseurs')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('factures_achat')
      .select('fournisseur_id, date_facture, total_ttc, statut')
      .is('archived_at', null)
      .order('date_facture', { ascending: false }),
  ])

  // Build per-fournisseur aggregates
  const dernierAchatMap: Record<string, string> = {}
  const achatsParFournisseur: Record<string, { total: number; count: number }> = {}

  for (const fa of facturesAchat || []) {
    if (!dernierAchatMap[fa.fournisseur_id]) {
      dernierAchatMap[fa.fournisseur_id] = fa.date_facture
    }
    if (!achatsParFournisseur[fa.fournisseur_id]) {
      achatsParFournisseur[fa.fournisseur_id] = { total: 0, count: 0 }
    }
    achatsParFournisseur[fa.fournisseur_id].total += Number(fa.total_ttc)
    achatsParFournisseur[fa.fournisseur_id].count += 1
  }

  const fournisseursWithAchat = (fournisseurs || []).map((f) => ({
    ...f,
    dernier_achat: dernierAchatMap[f.id] || null,
    total_achats: achatsParFournisseur[f.id]?.total || 0,
    nb_factures: achatsParFournisseur[f.id]?.count || 0,
  }))

  // Global stats
  const totalAchatsTTC = (facturesAchat || []).reduce((s, f) => s + Number(f.total_ttc), 0)
  const nbFacturesAchat = (facturesAchat || []).length
  const nbImpaye = (facturesAchat || []).filter((f) => f.statut === 'a_payer' || f.statut === 'en_retard').length

  return (
    <FournisseursPageContent
      initialFournisseurs={fournisseursWithAchat}
      stats={{
        totalFournisseurs: (fournisseurs || []).length,
        totalAchatsTTC,
        nbFacturesAchat,
        nbImpaye,
      }}
    />
  )
}
