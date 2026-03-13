import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — Liste tous les objectifs CA de l'entreprise
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: currentUser } = await supabase
    .from('utilisateurs')
    .select('entreprise_id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const { data: objectifs, error } = await supabase
    .from('objectifs_ca')
    .select('*')
    .eq('entreprise_id', currentUser.entreprise_id)
    .order('annee', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ objectifs })
}

// POST — Creer ou mettre a jour un objectif CA pour une annee
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: currentUser } = await supabase
    .from('utilisateurs')
    .select('entreprise_id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser || currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const body = await request.json()
  const { annee, montant } = body

  if (!annee || typeof annee !== 'number' || annee < 2020 || annee > 2099) {
    return NextResponse.json({ error: 'Annee invalide' }, { status: 400 })
  }

  if (montant === undefined || typeof montant !== 'number' || montant < 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }

  // Upsert : creer ou mettre a jour
  const { data: objectif, error } = await supabase
    .from('objectifs_ca')
    .upsert(
      {
        entreprise_id: currentUser.entreprise_id,
        annee,
        montant,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entreprise_id,annee' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ objectif })
}

// DELETE — Supprimer un objectif CA
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: currentUser } = await supabase
    .from('utilisateurs')
    .select('entreprise_id, role')
    .eq('id', user.id)
    .single()

  if (!currentUser || currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const annee = parseInt(searchParams.get('annee') || '')

  if (!annee) {
    return NextResponse.json({ error: 'Annee requise' }, { status: 400 })
  }

  const { error } = await supabase
    .from('objectifs_ca')
    .delete()
    .eq('entreprise_id', currentUser.entreprise_id)
    .eq('annee', annee)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
