import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { signature_image } = await request.json()

  if (!signature_image) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: pv, error: findError } = await supabase
    .from('pv_reception')
    .select('id, chantier_id, signature_client, token_expiration')
    .eq('token_signature', token)
    .single()

  if (findError || !pv) {
    return NextResponse.json({ error: 'PV non trouvé' }, { status: 404 })
  }

  if (pv.signature_client) {
    return NextResponse.json({ error: 'PV déjà signé' }, { status: 400 })
  }

  if (pv.token_expiration && new Date(pv.token_expiration) < new Date()) {
    return NextResponse.json({ error: 'Lien expiré' }, { status: 400 })
  }

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const { error: updateError } = await supabase
    .from('pv_reception')
    .update({
      signature_client: signature_image,
      signature_date: new Date().toISOString(),
      signature_ip: ip,
      signature_user_agent: userAgent,
      token_signature: null,
    })
    .eq('id', pv.id)

  if (updateError) {
    return NextResponse.json({ error: 'Erreur de mise à jour' }, { status: 500 })
  }

  // Update chantier status to 'livre'
  await supabase
    .from('chantiers')
    .update({ statut: 'livre', date_fin_reelle: new Date().toISOString().split('T')[0] })
    .eq('id', pv.chantier_id)

  return NextResponse.json({ success: true })
}
