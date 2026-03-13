import { createClient } from '@/lib/supabase/server'
import { TresoreriePageContent } from '@/components/tresorerie/TresoreriePageContent'

interface AutoMouvement {
  id: string
  entreprise_id: string
  date_mouvement: string
  libelle: string
  montant: number
  type: 'encaissement_client' | 'paiement_fournisseur' | 'autre_entree' | 'autre_sortie'
  facture_id: string | null
  facture_achat_id: string | null
  rapproche: boolean
  reference_bancaire: string | null
  created_at: string
  source: 'auto' | 'manuel'
}

export interface ResumeAnnuel {
  annee: number
  ventes: { total_ht: number; total_tva: number; total_ttc: number; total_ouvert: number }
  achats: { total_ht: number; total_tva: number; total_ttc: number; total_ouvert: number }
  trimestres: {
    trimestre: number
    ventes_ttc: number
    achats_ttc: number
    flux: number
  }[]
}

export default async function TresoreriePage() {
  const supabase = await createClient()

  // 1. Fetch manual movements
  const { data: mouvementsManuels } = await supabase
    .from('mouvements_tresorerie')
    .select('*')
    .order('date_mouvement', { ascending: false })

  // 2. Fetch paiements clients (encaissements) with facture info
  const { data: paiementsClients } = await supabase
    .from('paiements_clients')
    .select('*, facture:factures(numero, client:clients(nom, prenom, raison_sociale, type))')
    .order('date_paiement', { ascending: false })

  // 3. Fetch echeances fournisseurs payees (decaissements) with facture_achat info
  const { data: echeancesFournisseurs } = await supabase
    .from('echeances_fournisseurs')
    .select('*, facture_achat:factures_achat(entreprise_id, numero_fournisseur, fournisseur:fournisseurs(raison_sociale))')
    .eq('statut', 'paye')
    .order('date_paiement', { ascending: false })

  // Build set of existing manual movement facture references to avoid duplicates
  const manualFactureIds = new Set(
    (mouvementsManuels || [])
      .filter((m) => m.facture_id)
      .map((m) => m.facture_id)
  )
  const manualFactureAchatIds = new Set(
    (mouvementsManuels || [])
      .filter((m) => m.facture_achat_id)
      .map((m) => m.facture_achat_id)
  )

  // Convert manual movements
  const manuels: AutoMouvement[] = (mouvementsManuels || []).map((m) => ({
    ...m,
    source: 'manuel' as const,
  }))

  // Convert paiements clients to auto movements (skip if already has manual entry with same facture_id)
  const autoEncaissements: AutoMouvement[] = (paiementsClients || [])
    .filter((p) => !manualFactureIds.has(p.facture_id))
    .map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const facture = p.facture as any
      let clientName = ''
      if (facture?.client) {
        const c = facture.client
        if (c.type === 'professionnel' && c.raison_sociale) {
          clientName = c.raison_sociale
        } else {
          clientName = [c.prenom, c.nom].filter(Boolean).join(' ')
        }
      }
      return {
        id: `pc-${p.id}`,
        entreprise_id: p.entreprise_id,
        date_mouvement: p.date_paiement,
        libelle: `Paiement ${facture?.numero || ''} - ${clientName}`.trim(),
        montant: p.montant,
        type: 'encaissement_client' as const,
        facture_id: p.facture_id,
        facture_achat_id: null,
        rapproche: false,
        reference_bancaire: p.reference_bancaire,
        created_at: p.created_at,
        source: 'auto' as const,
      }
    })

  // Convert echeances fournisseurs payees to auto movements
  const autoDecaissements: AutoMouvement[] = (echeancesFournisseurs || [])
    .filter((e) => e.date_paiement && !manualFactureAchatIds.has(e.facture_achat_id))
    .map((e) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fa = e.facture_achat as any
      const fournisseurNom = fa?.fournisseur?.raison_sociale || ''
      return {
        id: `ef-${e.id}`,
        entreprise_id: fa?.entreprise_id || '',
        date_mouvement: e.date_paiement!,
        libelle: `Paiement ${fa?.numero_fournisseur || ''} - ${fournisseurNom}`.trim(),
        montant: -e.montant,
        type: 'paiement_fournisseur' as const,
        facture_id: null,
        facture_achat_id: e.facture_achat_id,
        rapproche: false,
        reference_bancaire: null,
        created_at: e.created_at,
        source: 'auto' as const,
      }
    })

  // Combine and sort all movements by date descending
  const allMouvements = [...manuels, ...autoEncaissements, ...autoDecaissements]
    .sort((a, b) => b.date_mouvement.localeCompare(a.date_mouvement))

  const totalEncaissements = allMouvements
    .filter((m) => m.montant > 0)
    .reduce((sum, m) => sum + m.montant, 0)

  const totalDecaissements = allMouvements
    .filter((m) => m.montant < 0)
    .reduce((sum, m) => sum + Math.abs(m.montant), 0)

  const solde = totalEncaissements - totalDecaissements

  // --- Resume annuel financier ---
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

  // Fetch all factures (ventes)
  const { data: factures } = await supabase
    .from('factures')
    .select('date_facture, statut, total_ht, total_tva, total_ttc, solde_ttc')
    .neq('statut', 'brouillon')
    .gte('date_facture', `${years[years.length - 1]}-01-01`)
    .order('date_facture')

  // Fetch all factures achat
  const { data: facturesAchat } = await supabase
    .from('factures_achat')
    .select('id, date_facture, statut, total_ht, total_tva, total_ttc')
    .gte('date_facture', `${years[years.length - 1]}-01-01`)
    .order('date_facture')

  // Fetch paid amounts for factures_achat to compute ouvert
  const { data: echeancesFournAll } = await supabase
    .from('echeances_fournisseurs')
    .select('facture_achat_id, montant, statut')

  // Build map of total paid per facture_achat
  const paidPerFactureAchat = new Map<string, number>()
  for (const e of echeancesFournAll || []) {
    if (e.statut === 'paye') {
      paidPerFactureAchat.set(
        e.facture_achat_id,
        (paidPerFactureAchat.get(e.facture_achat_id) || 0) + e.montant
      )
    }
  }

  const resumesAnnuels: ResumeAnnuel[] = years.map((annee) => {
    const yearFactures = (factures || []).filter(
      (f) => f.date_facture && f.date_facture.startsWith(`${annee}`)
    )
    const yearAchats = (facturesAchat || []).filter(
      (f) => f.date_facture && f.date_facture.startsWith(`${annee}`)
    )

    // Ventes
    const ventesHT = yearFactures.reduce((s, f) => s + (f.total_ht || 0), 0)
    const ventesTVA = yearFactures.reduce((s, f) => s + (f.total_tva || 0), 0)
    const ventesTTC = yearFactures.reduce((s, f) => s + (f.total_ttc || 0), 0)
    const ventesOuvert = yearFactures
      .filter((f) => f.statut !== 'payee')
      .reduce((s, f) => s + (f.solde_ttc || 0), 0)

    // Achats
    const achatsHT = yearAchats.reduce((s, f) => s + (f.total_ht || 0), 0)
    const achatsTVA = yearAchats.reduce((s, f) => s + (f.total_tva || 0), 0)
    const achatsTTC = yearAchats.reduce((s, f) => s + (f.total_ttc || 0), 0)
    const achatsOuvert = yearAchats.reduce((s, f) => {
      const paid = paidPerFactureAchat.get(f.id as string) || 0
      const ouvert = (f.total_ttc || 0) - paid
      return s + (ouvert > 0 ? ouvert : 0)
    }, 0)

    // Trimestres
    const trimestres = [1, 2, 3, 4].map((q) => {
      const startMonth = (q - 1) * 3 + 1
      const endMonth = q * 3
      const qFactures = yearFactures.filter((f) => {
        const month = parseInt(f.date_facture.split('-')[1], 10)
        return month >= startMonth && month <= endMonth
      })
      const qAchats = yearAchats.filter((f) => {
        const month = parseInt(f.date_facture.split('-')[1], 10)
        return month >= startMonth && month <= endMonth
      })
      const vTTC = qFactures.reduce((s, f) => s + (f.total_ttc || 0), 0)
      const aTTC = qAchats.reduce((s, f) => s + (f.total_ttc || 0), 0)
      return {
        trimestre: q,
        ventes_ttc: vTTC,
        achats_ttc: aTTC,
        flux: vTTC - aTTC,
      }
    })

    return {
      annee,
      ventes: { total_ht: ventesHT, total_tva: ventesTVA, total_ttc: ventesTTC, total_ouvert: ventesOuvert },
      achats: { total_ht: achatsHT, total_tva: achatsTVA, total_ttc: achatsTTC, total_ouvert: achatsOuvert },
      trimestres,
    }
  })

  return (
    <TresoreriePageContent
      initialMouvements={allMouvements}
      initialStats={{ totalEncaissements, totalDecaissements, solde }}
      resumesAnnuels={resumesAnnuels}
    />
  )
}
