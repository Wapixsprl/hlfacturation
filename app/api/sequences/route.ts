import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('entreprise_id, role')
    .eq('id', user.id)
    .single()

  if (!utilisateur || utilisateur.role !== 'super_admin') return null
  return { supabase, utilisateur }
}

export async function GET() {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { supabase, utilisateur } = ctx
  const annee = new Date().getFullYear()

  const { data: entreprise } = await supabase
    .from('entreprises')
    .select('prefixe_devis, prefixe_facture, prefixe_avoir')
    .eq('id', utilisateur.entreprise_id)
    .single()

  const prefixes = {
    devis: entreprise?.prefixe_devis || 'DEV',
    facture: entreprise?.prefixe_facture || 'FAC',
    avoir: entreprise?.prefixe_avoir || 'AVO',
  }

  const service = serviceClient()
  const { data: sequences } = await service
    .from('sequences_numerotation')
    .select('type_doc, dernier_numero')
    .eq('entreprise_id', utilisateur.entreprise_id)
    .eq('annee', annee)
    .in('type_doc', Object.values(prefixes))

  const seqMap = Object.fromEntries(
    (sequences || []).map((s) => [s.type_doc, s.dernier_numero as number])
  )

  return NextResponse.json({
    annee,
    devis: { prefix: prefixes.devis, prochain: (seqMap[prefixes.devis] ?? 0) + 1 },
    facture: { prefix: prefixes.facture, prochain: (seqMap[prefixes.facture] ?? 0) + 1 },
    avoir: { prefix: prefixes.avoir, prochain: (seqMap[prefixes.avoir] ?? 0) + 1 },
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { utilisateur } = ctx
  const body = await req.json()
  const { updates } = body as {
    updates: Array<{ prefix: string; prochain_numero: number }>
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  for (const u of updates) {
    if (!u.prefix || typeof u.prochain_numero !== 'number' || u.prochain_numero < 1) {
      return NextResponse.json({ error: 'Invalid update entry' }, { status: 400 })
    }
  }

  const annee = new Date().getFullYear()
  const service = serviceClient()

  const rows = updates.map((u) => ({
    entreprise_id: utilisateur.entreprise_id,
    type_doc: u.prefix.toUpperCase(),
    annee,
    dernier_numero: u.prochain_numero - 1,
  }))

  const { error } = await service
    .from('sequences_numerotation')
    .upsert(rows, { onConflict: 'entreprise_id,type_doc,annee' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
