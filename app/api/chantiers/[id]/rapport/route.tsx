import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ChantierRapportPDF } from '@/lib/pdf/chantier-rapport-template'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  // Fetch chantier with client, equipe, devis
  const { data: chantier, error: chantierError } = await supabase
    .from('chantiers')
    .select(`
      *,
      client:clients(id, nom, prenom, raison_sociale, type, email, telephone, adresse, code_postal, ville),
      equipe:equipes(id, nom, couleur),
      devis:devis(id, numero, total_ht, total_ttc, statut)
    `)
    .eq('id', id)
    .single()

  if (chantierError || !chantier) {
    return NextResponse.json({ error: 'Chantier non trouve' }, { status: 404 })
  }

  // Fetch entreprise
  const { data: entreprise } = await supabase
    .from('entreprises')
    .select('nom, logo_url, tva_numero, telephone, email, adresse, code_postal, ville')
    .eq('id', chantier.entreprise_id)
    .single()

  if (!entreprise) {
    return NextResponse.json({ error: 'Entreprise non trouvee' }, { status: 404 })
  }

  // Fetch journal entries with auteur
  const { data: journal } = await supabase
    .from('journal_chantier')
    .select('id, date_entree, type, contenu, photos, meteo, avancement_pct, auteur:utilisateurs(id, nom, prenom)')
    .eq('chantier_id', id)
    .order('date_entree', { ascending: false })

  // Fetch taches with equipe
  const { data: taches } = await supabase
    .from('taches_chantier')
    .select('id, titre, statut, equipe:equipes(id, nom)')
    .eq('chantier_id', id)
    .order('ordre')

  // Fetch sous-traitants with fournisseur
  const { data: sousTraitants } = await supabase
    .from('sous_traitants_chantier')
    .select('id, role, montant_prevu_ht, fournisseur:fournisseurs(id, raison_sociale)')
    .eq('chantier_id', id)

  try {
    const pdfBuffer = await renderToBuffer(
      <ChantierRapportPDF
        chantier={chantier}
        client={chantier.client}
        equipe={chantier.equipe || null}
        devis={chantier.devis || null}
        journal={(journal || []) as never[]}
        taches={(taches || []) as never[]}
        sousTraitants={(sousTraitants || []) as never[]}
        entreprise={entreprise}
      />
    )

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="rapport-${chantier.numero}.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur generation PDF'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
