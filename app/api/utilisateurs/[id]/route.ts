import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// PUT — Modifier un utilisateur (nom, prenom, role, actif)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Verifier que l'utilisateur cible est de la meme entreprise
  const { data: targetUser } = await supabase
    .from('utilisateurs')
    .select('id, entreprise_id')
    .eq('id', id)
    .eq('entreprise_id', currentUser.entreprise_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const body = await request.json()
  const { nom, prenom, role, actif } = body

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (nom !== undefined) updateData.nom = nom || null
  if (prenom !== undefined) updateData.prenom = prenom || null
  if (role !== undefined) {
    const validRoles = ['super_admin', 'utilisateur', 'comptable', 'ouvrier', 'equipe', 'resp_equipe']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Role invalide' }, { status: 400 })
    }
    // Empecher de retirer le dernier super_admin
    if (role !== 'super_admin' && id === user.id) {
      const { count } = await supabase
        .from('utilisateurs')
        .select('id', { count: 'exact', head: true })
        .eq('entreprise_id', currentUser.entreprise_id)
        .eq('role', 'super_admin')
        .eq('actif', true)

      if (count !== null && count <= 1) {
        return NextResponse.json(
          { error: 'Impossible de retirer le dernier super admin' },
          { status: 400 }
        )
      }
    }
    updateData.role = role
  }
  if (actif !== undefined) {
    // Empecher de desactiver soi-meme
    if (id === user.id && actif === false) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas vous desactiver vous-meme' },
        { status: 400 }
      )
    }
    updateData.actif = actif
  }

  const { data: updated, error } = await supabase
    .from('utilisateurs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ utilisateur: updated })
}

// DELETE — Supprimer un utilisateur (auth + table)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Empecher de se supprimer soi-meme
  if (id === user.id) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte' },
      { status: 400 }
    )
  }

  // Verifier que l'utilisateur cible est de la meme entreprise
  const { data: targetUser } = await supabase
    .from('utilisateurs')
    .select('id, entreprise_id')
    .eq('id', id)
    .eq('entreprise_id', currentUser.entreprise_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Supprimer de la table utilisateurs d'abord
  const { error: deleteError } = await adminSupabase
    .from('utilisateurs')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Supprimer de auth.users
  const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(id)
  if (authDeleteError) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
