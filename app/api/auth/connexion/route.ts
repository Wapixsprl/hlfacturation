import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: utilisateur } = await serviceSupabase
    .from('utilisateurs')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (!utilisateur) return NextResponse.json({ error: 'Utilisateur non trouve' }, { status: 404 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || null
  const userAgent = request.headers.get('user-agent') || null
  const now = new Date().toISOString()

  await Promise.all([
    serviceSupabase
      .from('utilisateurs')
      .update({ derniere_connexion: now, updated_at: now })
      .eq('id', user.id),
    serviceSupabase
      .from('connexion_logs')
      .insert({
        utilisateur_id: user.id,
        entreprise_id: utilisateur.entreprise_id,
        ip,
        user_agent: userAgent,
      }),
  ])

  return NextResponse.json({ success: true })
}
