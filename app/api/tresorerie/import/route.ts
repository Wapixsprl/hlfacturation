import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

interface ParsedRow {
  date: string
  libelle: string
  montant: number
  reference?: string
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null

  // XLSX serial date number
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw)
    if (date) {
      const y = date.y
      const m = String(date.m).padStart(2, '0')
      const d = String(date.d).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }

  const str = String(raw).trim()

  // DD/MM/YYYY or DD-MM-YYYY
  const euMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (euMatch) {
    const [, d, m, y] = euMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // YYYY-MM-DD (ISO)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return isoMatch[0]
  }

  return null
}

function parseMontant(raw: unknown): number | null {
  if (typeof raw === 'number') return Math.round(raw * 100) / 100
  if (!raw) return null
  const str = String(raw)
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/EUR/gi, '')
    .trim()

  // Handle comma as decimal separator (European)
  // "1.234,56" → "1234.56"  or  "1234,56" → "1234.56"
  let normalized = str
  if (normalized.includes(',') && normalized.includes('.')) {
    // "1.234,56" format — dots are thousands, comma is decimal
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    // "1234,56" — comma is decimal
    normalized = normalized.replace(',', '.')
  }

  const num = parseFloat(normalized)
  return isNaN(num) ? null : Math.round(num * 100) / 100
}

function detectColumns(headers: string[]): {
  dateCol: number
  libelleCol: number
  montantCol: number
  creditCol: number
  debitCol: number
  referenceCol: number
} {
  const lower = headers.map((h) => (h || '').toLowerCase().trim())

  let dateCol = -1
  let libelleCol = -1
  let montantCol = -1
  let creditCol = -1
  let debitCol = -1
  let referenceCol = -1

  for (let i = 0; i < lower.length; i++) {
    const h = lower[i]

    // Date
    if (dateCol === -1 && (
      h.includes('date') || h === 'datum' || h.includes('valeur') || h.includes('comptable')
    )) {
      dateCol = i
    }

    // Libelle
    if (libelleCol === -1 && (
      h.includes('libelle') || h.includes('libellé') || h.includes('description') ||
      h.includes('communication') || h.includes('detail') || h.includes('détail') ||
      h.includes('mededeling') || h.includes('omschrijving')
    )) {
      libelleCol = i
    }

    // Montant unique column
    if (montantCol === -1 && (
      h === 'montant' || h === 'bedrag' || h === 'amount' || h.includes('montant')
    ) && !h.includes('credit') && !h.includes('debit') && !h.includes('crédit') && !h.includes('débit')) {
      montantCol = i
    }

    // Credit / Debit separate columns
    if (creditCol === -1 && (
      h.includes('credit') || h.includes('crédit') || h.includes('entree') || h.includes('entrée')
    )) {
      creditCol = i
    }
    if (debitCol === -1 && (
      h.includes('debit') || h.includes('débit') || h.includes('sortie')
    )) {
      debitCol = i
    }

    // Reference
    if (referenceCol === -1 && (
      h.includes('reference') || h.includes('référence') || h.includes('ref') ||
      h.includes('communication structuree') || h.includes('structured')
    )) {
      referenceCol = i
    }
  }

  return { dateCol, libelleCol, montantCol, creditCol, debitCol, referenceCol }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('entreprise_id')
    .eq('id', userData.user.id)
    .single()

  if (!utilisateur) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
  }

  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/csv',
  ]

  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    return NextResponse.json({ error: 'Format non supporte (XLSX, XLS ou CSV uniquement)' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
    }

    const sheet = workbook.Sheets[sheetName]
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (rawData.length < 2) {
      return NextResponse.json({ error: 'Le fichier doit contenir au moins un en-tete et une ligne de donnees' }, { status: 400 })
    }

    // Find header row (first row with recognizable headers)
    let headerRowIdx = 0
    let columns = detectColumns((rawData[0] as string[]).map(String))

    // If first row didn't work, try a few more rows (some bank exports have metadata rows first)
    if (columns.dateCol === -1 || (columns.montantCol === -1 && columns.creditCol === -1)) {
      for (let i = 1; i < Math.min(rawData.length, 10); i++) {
        const candidate = detectColumns((rawData[i] as string[]).map(String))
        if (candidate.dateCol !== -1 && (candidate.montantCol !== -1 || candidate.creditCol !== -1)) {
          headerRowIdx = i
          columns = candidate
          break
        }
      }
    }

    if (columns.dateCol === -1) {
      return NextResponse.json({ error: 'Colonne "Date" introuvable. Verifiez les en-tetes.' }, { status: 400 })
    }

    if (columns.montantCol === -1 && columns.creditCol === -1) {
      return NextResponse.json({ error: 'Colonne "Montant" introuvable. Verifiez les en-tetes.' }, { status: 400 })
    }

    const rows: ParsedRow[] = []
    const errors: string[] = []

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i] as unknown[]
      if (!row || row.every((cell) => !cell || String(cell).trim() === '')) continue

      const dateRaw = row[columns.dateCol]
      const date = parseDate(dateRaw)
      if (!date) {
        errors.push(`Ligne ${i + 1}: date invalide "${dateRaw}"`)
        continue
      }

      const libelle = columns.libelleCol >= 0
        ? String(row[columns.libelleCol] || '').trim()
        : 'Import bancaire'

      let montant: number | null = null

      if (columns.montantCol >= 0) {
        // Single montant column (positive = credit, negative = debit)
        montant = parseMontant(row[columns.montantCol])
      } else {
        // Separate credit/debit columns
        const credit = columns.creditCol >= 0 ? parseMontant(row[columns.creditCol]) : null
        const debit = columns.debitCol >= 0 ? parseMontant(row[columns.debitCol]) : null

        if (credit && credit > 0) {
          montant = credit
        } else if (debit && debit > 0) {
          montant = -debit
        } else if (credit !== null) {
          montant = credit
        } else if (debit !== null) {
          montant = -Math.abs(debit)
        }
      }

      if (montant === null || montant === 0) {
        errors.push(`Ligne ${i + 1}: montant invalide`)
        continue
      }

      const reference = columns.referenceCol >= 0
        ? String(row[columns.referenceCol] || '').trim() || undefined
        : undefined

      rows.push({ date, libelle, montant, reference })
    }

    if (rows.length === 0) {
      return NextResponse.json({
        error: 'Aucune ligne valide trouvee',
        details: errors.slice(0, 10),
      }, { status: 400 })
    }

    // Return preview data for user confirmation before import
    const preview = formData.get('preview')
    if (preview === 'true') {
      return NextResponse.json({
        success: true,
        preview: true,
        count: rows.length,
        errors: errors.length,
        errorDetails: errors.slice(0, 5),
        rows: rows.slice(0, 20), // Show first 20 rows as preview
        totalCredit: rows.filter((r) => r.montant > 0).reduce((s, r) => s + r.montant, 0),
        totalDebit: rows.filter((r) => r.montant < 0).reduce((s, r) => s + Math.abs(r.montant), 0),
      })
    }

    // Actually insert the data
    const inserts = rows.map((r) => ({
      entreprise_id: utilisateur.entreprise_id,
      date_mouvement: r.date,
      libelle: r.libelle,
      montant: r.montant,
      type: r.montant >= 0 ? 'autre_entree' : 'autre_sortie',
      reference_bancaire: r.reference || null,
      rapproche: false,
    }))

    // Insert in batches of 100
    let inserted = 0
    for (let i = 0; i < inserts.length; i += 100) {
      const batch = inserts.slice(i, i + 100)
      const { error } = await supabase.from('mouvements_tresorerie').insert(batch)
      if (error) {
        return NextResponse.json({
          error: `Erreur lors de l'insertion (lot ${Math.floor(i / 100) + 1})`,
          detail: error.message,
          inserted,
        }, { status: 500 })
      }
      inserted += batch.length
    }

    return NextResponse.json({
      success: true,
      inserted,
      errors: errors.length,
      errorDetails: errors.slice(0, 5),
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({
      error: 'Erreur lors du traitement du fichier',
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
