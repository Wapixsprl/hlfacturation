import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    // DD/MM/YYYY
    const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  }
  if (typeof raw === 'number') {
    // Excel serial date
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
    return d.toISOString().slice(0, 10)
  }
  return null
}

function toNum(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') return parseFloat(raw.replace(',', '.')) || 0
  return 0
}

function str(raw: unknown): string {
  if (raw == null) return ''
  return String(raw).trim()
}

async function findOrCreateClient(
  supabase: ReturnType<typeof createServiceClient>,
  entrepriseId: string,
  nomClient: string,
  adresse?: string,
  codePostal?: string,
  ville?: string,
  pays?: string
): Promise<string | null> {
  if (!nomClient) return null

  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('entreprise_id', entrepriseId)
    .ilike('nom', nomClient.trim())
    .limit(1)
    .single()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      entreprise_id: entrepriseId,
      nom: nomClient.trim(),
      type: 'particulier',
      adresse: adresse || null,
      code_postal: codePostal || null,
      ville: ville || null,
      pays: pays || 'BE',
    })
    .select('id')
    .single()

  if (error || !created) return null
  return created.id
}

type ImportType = 'devis' | 'factures' | 'factures_achat'
type ImportRow = Record<string, unknown>

async function importDevis(
  supabase: ReturnType<typeof createServiceClient>,
  entrepriseId: string,
  rows: ImportRow[]
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const numVertuoza = str(row['Numéro'] ?? row['Numero'] ?? row['numero'] ?? '')
      const reference = str(row['Référence'] ?? row['Reference'] ?? '')
      const dateDevis = parseDate(row['Date'] ?? row['date']) ?? new Date().toISOString().slice(0, 10)
      const dateValidite = parseDate(row['Date de validité'] ?? row['Date de validite'])
      const nomClient = str(row['Client'] ?? row['client'] ?? '')
      const totalHt = toNum(row['Total HT'] ?? row['total_ht'] ?? 0)
      const totalTtc = toNum(row['Total TTC'] ?? row['total_ttc'] ?? 0)
      const totalTva = Math.round((totalTtc - totalHt) * 100) / 100

      const statutRaw = str(row['Statut'] ?? row['statut'] ?? '')
      const statutMap: Record<string, string> = {
        'À envoyer': 'brouillon',
        'A envoyer': 'brouillon',
        'Accepté': 'accepte',
        'Accepte': 'accepte',
        'Refusé': 'refuse',
        'Refuse': 'refuse',
        'Expiré': 'expire',
        'Expire': 'expire',
      }
      const statut = statutMap[statutRaw] ?? 'brouillon'

      const numero = `IMP-${numVertuoza || Date.now()}`

      // Check duplicate
      const { data: existing } = await supabase
        .from('devis')
        .select('id')
        .eq('numero', numero)
        .eq('entreprise_id', entrepriseId)
        .limit(1)
        .single()

      if (existing) {
        errors.push(`Devis ${numero} déjà importé — ignoré`)
        continue
      }

      const adresse = str(row['Adresse - Rue'] ?? row['Rue'] ?? '')
      const codePostal = str(row['Code postal'] ?? row['Code Postal'] ?? '')
      const ville = str(row['Ville'] ?? row['Localité'] ?? row['Localite'] ?? '')
      const pays = str(row['Pays'] ?? 'BE')

      const clientId = await findOrCreateClient(supabase, entrepriseId, nomClient, adresse, codePostal, ville, pays)
      if (!clientId) {
        errors.push(`Devis ${numero} — client introuvable ou non créé`)
        continue
      }

      const { data: devis, error: devisError } = await supabase
        .from('devis')
        .insert({
          entreprise_id: entrepriseId,
          client_id: clientId,
          numero,
          titre: reference || `Import Vertuoza ${numVertuoza}`,
          statut,
          date_devis: dateDevis,
          date_validite: dateValidite,
          total_ht: totalHt,
          total_tva: totalTva,
          total_ttc: totalTtc,
        })
        .select('id')
        .single()

      if (devisError || !devis) {
        errors.push(`Devis ${numero} — erreur insertion: ${devisError?.message}`)
        continue
      }

      // Ligne unique
      await supabase.from('devis_lignes').insert({
        devis_id: devis.id,
        ordre: 1,
        type: 'produit',
        designation: `Import Vertuoza - ${reference || numVertuoza}`,
        quantite: 1,
        prix_unitaire_ht: totalHt,
        taux_tva: 21.00,
        total_ht: totalHt,
      })

      imported++
    } catch (e) {
      errors.push(`Erreur ligne: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { imported, errors }
}

async function importFactures(
  supabase: ReturnType<typeof createServiceClient>,
  entrepriseId: string,
  rows: ImportRow[]
): Promise<{ imported: number; errors: string[] }> {
  let imported = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      const numVertuoza = str(row['Numéro de la facture'] ?? row['Numero de la facture'] ?? row['Numéro'] ?? '')
      const reference = str(row['Référence'] ?? row['Reference'] ?? '')
      const nomClient = str(row['Nom du client'] ?? row['Client'] ?? '')
      const dateFacture = parseDate(row['Date de la facture'] ?? row['Date']) ?? new Date().toISOString().slice(0, 10)
      const dateEcheance = parseDate(row['Date d\'échéance'] ?? row["Date d'echeance"])
      const totalHt = toNum(row['Total HT'] ?? 0)
      const totalTtc = toNum(row['Total TTC'] ?? 0)
      const totalTva = Math.round((totalTtc - totalHt) * 100) / 100

      const typeRaw = str(row['Type'] ?? '')
      const typeMap: Record<string, string> = {
        'Acompte': 'acompte',
        'Note de crédit': 'avoir',
        'Note de credit': 'avoir',
      }
      const type = typeMap[typeRaw] ?? 'facture'

      const statutRaw = str(row['Statut'] ?? '')
      const statutMap: Record<string, string> = {
        'Payé': 'payee',
        'Paye': 'payee',
        'À envoyer': 'brouillon',
        'A envoyer': 'brouillon',
        'Envoyée': 'envoyee',
        'Envoyee': 'envoyee',
        'En retard': 'en_retard',
      }
      const statut = statutMap[statutRaw] ?? 'brouillon'

      const numero = `IMPF-${numVertuoza || Date.now()}`

      const { data: existing } = await supabase
        .from('factures')
        .select('id')
        .eq('numero', numero)
        .eq('entreprise_id', entrepriseId)
        .limit(1)
        .single()

      if (existing) {
        errors.push(`Facture ${numero} déjà importée — ignorée`)
        continue
      }

      const adresse = str(row['Adresse de facturation - Rue'] ?? row['Rue'] ?? '')
      const numero_rue = str(row['Numéro'] ?? row['Numero'] ?? '')
      const codePostal = str(row['Code Postal'] ?? row['Code postal'] ?? '')
      const ville = str(row['Localité'] ?? row['Localite'] ?? row['Ville'] ?? '')
      const pays = str(row['Pays'] ?? 'BE')
      const adresseComplete = [adresse, numero_rue].filter(Boolean).join(' ')

      const clientId = await findOrCreateClient(supabase, entrepriseId, nomClient, adresseComplete, codePostal, ville, pays)
      if (!clientId) {
        errors.push(`Facture ${numero} — client introuvable ou non créé`)
        continue
      }

      const { data: facture, error: factureError } = await supabase
        .from('factures')
        .insert({
          entreprise_id: entrepriseId,
          client_id: clientId,
          numero,
          type,
          statut,
          date_facture: dateFacture,
          date_echeance: dateEcheance,
          total_ht: totalHt,
          total_tva: totalTva,
          total_ttc: totalTtc,
        })
        .select('id')
        .single()

      if (factureError || !facture) {
        errors.push(`Facture ${numero} — erreur insertion: ${factureError?.message}`)
        continue
      }

      await supabase.from('factures_lignes').insert({
        facture_id: facture.id,
        ordre: 1,
        type: 'produit',
        designation: `Import Vertuoza - ${reference || numVertuoza}`,
        quantite: 1,
        prix_unitaire_ht: totalHt,
        taux_tva: 21.00,
        total_ht: totalHt,
      })

      imported++
    } catch (e) {
      errors.push(`Erreur ligne: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { imported, errors }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Vérifier auth via cookie
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => {
            const cookieHeader = req.headers.get('cookie') ?? ''
            return cookieHeader.split(';').map(c => {
              const [name, ...rest] = c.trim().split('=')
              return { name: name.trim(), value: rest.join('=') }
            })
          },
          setAll: () => {},
        },
      }
    )

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: utilisateur } = await supabase
      .from('utilisateurs')
      .select('role, entreprise_id')
      .eq('id', user.id)
      .single()

    if (!utilisateur || utilisateur.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé — super_admin requis' }, { status: 403 })
    }

    const body = await req.json() as { type: ImportType; rows: ImportRow[] }
    const { type, rows } = body

    if (!type || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const entrepriseId = utilisateur.entreprise_id as string

    let result: { imported: number; errors: string[] }

    if (type === 'devis') {
      result = await importDevis(supabase, entrepriseId, rows)
    } else if (type === 'factures') {
      result = await importFactures(supabase, entrepriseId, rows)
    } else {
      return NextResponse.json({ error: `Type "${type}" non supporté pour l'instant` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('[import]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
