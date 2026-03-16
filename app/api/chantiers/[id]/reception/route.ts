import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chantierId } = await params
  const supabase = await createClient()

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await request.json()

  const token = crypto.randomUUID()
  const expiration = new Date()
  expiration.setDate(expiration.getDate() + 30)

  const { data, error } = await supabase
    .from('pv_reception')
    .insert({
      chantier_id: chantierId,
      observations: body.observations || null,
      reserves: body.reserves || [],
      photos_avant: body.photos_avant || [],
      photos_apres: body.photos_apres || [],
      token_signature: token,
      token_expiration: expiration.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
