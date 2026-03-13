import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (!utilisateur) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('logo') as File | null
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const allowed = ['png', 'jpg', 'jpeg', 'svg', 'webp']
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: 'Format non supporté. Utilisez PNG, JPG, SVG ou WebP.' }, { status: 400 })
  }

  const filePath = `${utilisateur.entreprise_id}/logo.${ext}`

  // Delete old logo files
  const { data: existing } = await supabase.storage.from('logos').list(utilisateur.entreprise_id)
  if (existing && existing.length > 0) {
    await supabase.storage.from('logos').remove(existing.map(f => `${utilisateur.entreprise_id}/${f.name}`))
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath)
  const logoUrl = urlData.publicUrl

  // Update entreprise
  await supabase
    .from('entreprises')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', utilisateur.entreprise_id)

  return NextResponse.json({ logo_url: logoUrl })
}
