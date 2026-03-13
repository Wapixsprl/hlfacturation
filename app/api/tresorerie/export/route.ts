import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDateBE(d: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatMontantCSV(n: number | null): string {
  if (n === null || n === undefined) return '0,00'
  return n.toFixed(2).replace('.', ',')
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'ventes' // 'ventes' | 'achats' | 'tresorerie'
  const dateDebut = url.searchParams.get('debut') // YYYY-MM-DD
  const dateFin = url.searchParams.get('fin') // YYYY-MM-DD

  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
  let csv = BOM
  let filename = ''

  if (type === 'ventes') {
    // Export factures émises
    let query = supabase
      .from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type, tva_numero)')
      .is('archived_at', null)
      .order('date_facture', { ascending: true })

    if (dateDebut) query = query.gte('date_facture', dateDebut)
    if (dateFin) query = query.lte('date_facture', dateFin)

    const { data: factures, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Header
    csv += 'Numero;Type;Date facture;Date echeance;Client;TVA Client;Total HT;Total TVA;Total TTC;Acomptes deduits;Solde TTC;Statut;Conditions paiement\n'

    for (const f of factures || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = f.client as any
      let clientName = ''
      if (client) {
        if (client.type === 'professionnel' && client.raison_sociale) {
          clientName = client.raison_sociale
        } else {
          clientName = [client.prenom, client.nom].filter(Boolean).join(' ')
        }
      }
      const tvaClient = client?.tva_numero || ''

      csv += [
        escapeCSV(f.numero),
        escapeCSV(f.type),
        formatDateBE(f.date_facture),
        formatDateBE(f.date_echeance),
        escapeCSV(clientName),
        escapeCSV(tvaClient),
        formatMontantCSV(f.total_ht),
        formatMontantCSV(f.total_tva),
        formatMontantCSV(f.total_ttc),
        formatMontantCSV(f.montant_acomptes_deduits),
        formatMontantCSV(f.solde_ttc),
        escapeCSV(f.statut),
        escapeCSV(f.conditions_paiement),
      ].join(';') + '\n'
    }

    const period = dateDebut && dateFin ? `_${dateDebut}_${dateFin}` : ''
    filename = `export_ventes${period}.csv`

  } else if (type === 'achats') {
    // Export factures d'achat
    let query = supabase
      .from('factures_achat')
      .select('*, fournisseur:fournisseurs(raison_sociale, tva_numero)')
      .is('archived_at', null)
      .order('date_facture', { ascending: true })

    if (dateDebut) query = query.gte('date_facture', dateDebut)
    if (dateFin) query = query.lte('date_facture', dateFin)

    const { data: factures, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    csv += 'N° Fournisseur;Fournisseur;TVA Fournisseur;Date facture;Designation;Categorie;Total HT;Total TVA;Total TTC;Statut\n'

    for (const f of factures || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fournisseur = f.fournisseur as any
      csv += [
        escapeCSV(f.numero_fournisseur),
        escapeCSV(fournisseur?.raison_sociale || ''),
        escapeCSV(fournisseur?.tva_numero || ''),
        formatDateBE(f.date_facture),
        escapeCSV(f.designation),
        escapeCSV(f.categorie),
        formatMontantCSV(f.total_ht),
        formatMontantCSV(f.total_tva),
        formatMontantCSV(f.total_ttc),
        escapeCSV(f.statut),
      ].join(';') + '\n'
    }

    const period = dateDebut && dateFin ? `_${dateDebut}_${dateFin}` : ''
    filename = `export_achats${period}.csv`

  } else if (type === 'tresorerie') {
    // Export mouvements trésorerie
    let query = supabase
      .from('mouvements_tresorerie')
      .select('*')
      .order('date_mouvement', { ascending: true })

    if (dateDebut) query = query.gte('date_mouvement', dateDebut)
    if (dateFin) query = query.lte('date_mouvement', dateFin)

    const { data: mouvements, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    csv += 'Date;Libelle;Type;Montant;Reference bancaire;Rapproche\n'

    for (const m of mouvements || []) {
      csv += [
        formatDateBE(m.date_mouvement),
        escapeCSV(m.libelle),
        escapeCSV(m.type),
        formatMontantCSV(m.montant),
        escapeCSV(m.reference_bancaire),
        m.rapproche ? 'Oui' : 'Non',
      ].join(';') + '\n'
    }

    const period = dateDebut && dateFin ? `_${dateDebut}_${dateFin}` : ''
    filename = `export_tresorerie${period}.csv`

  } else {
    return NextResponse.json({ error: 'Type non supporte (ventes, achats, tresorerie)' }, { status: 400 })
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
