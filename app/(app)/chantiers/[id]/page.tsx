import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ChantierDetailContent } from '@/components/chantiers/ChantierDetailContent'

export default async function ChantierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: chantier } = await supabase
    .from('chantiers')
    .select(`
      *,
      client:clients(id, nom, prenom, raison_sociale, type, email, telephone, adresse, code_postal, ville),
      equipe:equipes(id, nom, couleur),
      devis:devis(id, numero, total_ht, total_ttc, statut)
    `)
    .eq('id', id)
    .single()

  if (!chantier) notFound()

  const { data: journal } = await supabase
    .from('journal_chantier')
    .select('*, auteur:utilisateurs(id, nom, prenom)')
    .eq('chantier_id', id)
    .order('date_entree', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: taches } = await supabase
    .from('taches_chantier')
    .select('*, equipe:equipes(id, nom, couleur)')
    .eq('chantier_id', id)
    .order('ordre', { ascending: true })

  const { data: sousTraitants } = await supabase
    .from('sous_traitants_chantier')
    .select('*, fournisseur:fournisseurs(id, raison_sociale)')
    .eq('chantier_id', id)

  const { data: pvReception } = await supabase
    .from('pv_reception')
    .select('*')
    .eq('chantier_id', id)
    .order('created_at', { ascending: false })

  const { data: equipes } = await supabase
    .from('equipes')
    .select('id, nom, couleur')
    .eq('actif', true)
    .order('nom')

  const { data: fournisseurs } = await supabase
    .from('fournisseurs')
    .select('id, raison_sociale')
    .is('archived_at', null)
    .order('raison_sociale')

  // Get related invoices
  const { data: factures } = await supabase
    .from('factures')
    .select('id, numero, total_ttc, statut, date_facture')
    .eq('devis_id', chantier.devis_id)
    .is('archived_at', null)

  // Get related purchase invoices
  const { data: facturesAchat } = await supabase
    .from('factures_achat')
    .select('id, numero_fournisseur, total_ttc, statut, date_facture, fournisseur:fournisseurs(raison_sociale)')
    .eq('devis_id', chantier.devis_id)
    .is('archived_at', null)

  return (
    <ChantierDetailContent
      chantier={chantier}
      journal={journal || []}
      taches={taches || []}
      sousTraitants={sousTraitants || []}
      pvReception={pvReception || []}
      equipes={equipes || []}
      fournisseurs={fournisseurs || []}
      factures={factures || []}
      facturesAchat={(facturesAchat || []) as never[]}
    />
  )
}
