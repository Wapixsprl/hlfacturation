/**
 * GET /api/factures/journal-achats?debut=YYYY-MM-DD&fin=YYYY-MM-DD
 * Journal des achats (export Excel) des factures fournisseurs sur une période.
 */
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'

const CAT_LABEL: Record<string, string> = {
  materiaux: 'Matériaux', sous_traitance: 'Sous-traitance', carburant: 'Carburant',
  assurance: 'Assurance', outillage: 'Outillage', telecom: 'Télécom', autre: 'Autre',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: u } = await supabase.from('utilisateurs').select('entreprise_id, role').eq('id', user.id).single()
  if (!u) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (!['super_admin', 'comptable'].includes(u.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const year = new Date().getFullYear()
  const debut = req.nextUrl.searchParams.get('debut') || `${year}-01-01`
  const fin = req.nextUrl.searchParams.get('fin') || `${year}-12-31`

  const { data: factures, error } = await supabase
    .from('factures_achat')
    .select('numero_fournisseur, categorie, statut, date_facture, total_ht, total_tva, total_ttc, fournisseur:fournisseurs(raison_sociale, tva_numero)')
    .is('archived_at', null)
    .gte('date_facture', debut)
    .lte('date_facture', fin)
    .order('date_facture', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (factures ?? []).map((f) => {
    const fr = f.fournisseur as unknown as { raison_sociale: string | null; tva_numero: string | null } | null
    return {
      'N° Fournisseur': f.numero_fournisseur || '',
      'Fournisseur': fr?.raison_sociale || '',
      'N° TVA': fr?.tva_numero || '',
      'Date': f.date_facture,
      'Catégorie': CAT_LABEL[f.categorie || ''] || f.categorie || '',
      'Total HT': Number(f.total_ht || 0),
      'TVA': Number(f.total_tva || 0),
      'Total TTC': Number(f.total_ttc || 0),
      'Statut': f.statut,
    }
  })

  if (rows.length) {
    rows.push({
      'N° Fournisseur': '', 'Fournisseur': 'TOTAL', 'N° TVA': '', 'Date': '', 'Catégorie': '',
      'Total HT': rows.reduce((s, r) => s + Number(r['Total HT']), 0),
      'TVA': rows.reduce((s, r) => s + Number(r['TVA']), 0),
      'Total TTC': rows.reduce((s, r) => s + Number(r['Total TTC']), 0),
      'Statut': '',
    })
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Journal des achats')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="journal-achats_${debut}_${fin}.xlsx"`,
    },
  })
}
