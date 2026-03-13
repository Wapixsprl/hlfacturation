import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET — Liste tous les utilisateurs de l'entreprise
export async function GET() {
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

  const { data: utilisateurs, error } = await supabase
    .from('utilisateurs')
    .select('*')
    .eq('entreprise_id', currentUser.entreprise_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ utilisateurs })
}

// POST — Creer un nouvel utilisateur (auth + table utilisateurs)
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

  // Verifier la limite de 5 utilisateurs
  const { count } = await supabase
    .from('utilisateurs')
    .select('id', { count: 'exact', head: true })
    .eq('entreprise_id', currentUser.entreprise_id)

  if (count !== null && count >= 5) {
    return NextResponse.json(
      { error: 'Limite de 5 utilisateurs atteinte' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const { nom, prenom, email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'Email et role requis' }, { status: 400 })
  }

  const validRoles = ['super_admin', 'utilisateur', 'comptable']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Role invalide' }, { status: 400 })
  }

  // Utiliser le service role pour creer un utilisateur auth
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Creer l'utilisateur dans auth.users avec un mot de passe temporaire
  const tempPassword = generateTempPassword()
  const { data: newAuthUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe deja' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  if (!newAuthUser.user) {
    return NextResponse.json({ error: 'Erreur creation utilisateur' }, { status: 500 })
  }

  // Inserer dans la table utilisateurs
  const { data: newUtilisateur, error: insertError } = await adminSupabase
    .from('utilisateurs')
    .insert({
      id: newAuthUser.user.id,
      entreprise_id: currentUser.entreprise_id,
      nom: nom || null,
      prenom: prenom || null,
      email,
      role,
      actif: true,
    })
    .select()
    .single()

  if (insertError) {
    // Rollback : supprimer l'utilisateur auth cree
    await adminSupabase.auth.admin.deleteUser(newAuthUser.user.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Envoyer un email de reset password pour que l'utilisateur definisse son mot de passe
  await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  return NextResponse.json({ utilisateur: newUtilisateur, tempPassword }, { status: 201 })
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
