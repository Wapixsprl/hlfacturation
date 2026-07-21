import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: me } = await supabase
    .from('utilisateurs')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()
  if (!me) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const body = await request.json() as {
    type: 'total' | 'partiel'
    lignes?: Array<{ ligne_id: string; montant_ht: number }>
  }

  // 1. Récupère la facture d'origine + ses lignes
  const { data: facture } = await supabase
    .from('factures')
    .select('*')
    .eq('id', id)
    .eq('entreprise_id', me.entreprise_id)
    .single()

  if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const { data: lignesSource } = await supabase
    .from('factures_lignes')
    .select('*')
    .eq('facture_id', id)
    .order('ordre')

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Génère un numéro d'avoir (séquence AVO)
  const { data: numero, error: numErr } = await supabase.rpc('generate_numero', {
    p_type: 'AVO',
    p_entreprise_id: me.entreprise_id,
  })
  if (numErr || !numero) {
    return NextResponse.json({ error: 'Erreur génération numéro avoir' }, { status: 500 })
  }

  // 3. Détermine les lignes à inclure dans l'avoir
  let lignesAvoir: Array<{
    designation: string | null
    description: string | null
    type: string
    produit_id: string | null
    quantite: number
    unite: string | null
    prix_unitaire_ht: number
    remise_pct: number
    taux_tva: number
    total_ht: number
    ordre: number
  }> = []

  const sourceLignes = (lignesSource || []).filter(l => l.type === 'produit')

  if (body.type === 'total') {
    lignesAvoir = sourceLignes.map((l, i) => ({
      designation: l.designation,
      description: l.description,
      type: 'produit',
      produit_id: l.produit_id,
      quantite: l.quantite,
      unite: l.unite,
      prix_unitaire_ht: l.prix_unitaire_ht,
      remise_pct: l.remise_pct ?? 0,
      taux_tva: l.taux_tva,
      total_ht: l.total_ht,
      ordre: i + 1,
    }))
  } else {
    // Partiel : lignes + montants fournis par le client
    const lignesMap = new Map(sourceLignes.map(l => [l.id, l]))
    lignesAvoir = (body.lignes || []).map((sel, i) => {
      const src = lignesMap.get(sel.ligne_id)
      return {
        designation: src?.designation ?? null,
        description: src?.description ?? null,
        type: 'produit',
        produit_id: src?.produit_id ?? null,
        quantite: 1,
        unite: src?.unite ?? null,
        prix_unitaire_ht: sel.montant_ht,
        remise_pct: 0,
        taux_tva: src?.taux_tva ?? 21,
        total_ht: sel.montant_ht,
        ordre: i + 1,
      }
    })
  }

  // 4. Calcule les totaux
  const total_ht = lignesAvoir.reduce((s, l) => s + l.total_ht, 0)
  const total_tva = lignesAvoir.reduce((s, l) => {
    return s + Math.round(l.total_ht * l.taux_tva) / 100
  }, 0)
  const total_ttc = Math.round((total_ht + total_tva) * 100) / 100

  // 5. Crée l'avoir
  const { data: avoir, error: avoirErr } = await service
    .from('factures')
    .insert({
      entreprise_id: me.entreprise_id,
      client_id: facture.client_id,
      devis_id: facture.devis_id,
      facture_origine_id: id,
      numero,
      type: 'avoir',
      statut: 'brouillon',
      date_facture: new Date().toISOString().split('T')[0],
      mention_tva: facture.mention_tva,
      conditions_paiement: `Avoir sur facture ${facture.numero}${body.type === 'partiel' ? ' (partiel)' : ''}`,
      total_ht: Math.round(total_ht * 100) / 100,
      total_tva: Math.round(total_tva * 100) / 100,
      total_ttc,
      montant_acomptes_deduits: 0,
      solde_ttc: total_ttc,
    })
    .select('id, numero')
    .single()

  if (avoirErr || !avoir) {
    return NextResponse.json({ error: avoirErr?.message || 'Erreur création avoir' }, { status: 500 })
  }

  // 6. Insère les lignes
  if (lignesAvoir.length > 0) {
    const { error: lignesErr } = await service
      .from('factures_lignes')
      .insert(lignesAvoir.map(l => ({ ...l, facture_id: avoir.id })))
    if (lignesErr) {
      return NextResponse.json({ error: lignesErr.message }, { status: 500 })
    }
  }

  // 7. Réduit le solde de la facture d'origine du montant de l'avoir
  const soldeActuel = Number(facture.solde_ttc) > 0
    ? Number(facture.solde_ttc)
    : Math.max(0, Number(facture.total_ttc) - Number(facture.montant_acomptes_deduits || 0))
  const nouveauSolde = Math.max(0, Math.round((soldeActuel - total_ttc) * 100) / 100)
  await service
    .from('factures')
    .update({ solde_ttc: nouveauSolde })
    .eq('id', id)

  return NextResponse.json({ avoir_id: avoir.id, numero: avoir.numero })
}
