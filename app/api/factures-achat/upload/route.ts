import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (!utilisateur)
    return NextResponse.json(
      { error: 'Utilisateur introuvable' },
      { status: 404 }
    )

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file)
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error:
          'Format non supporte. Utilisez PDF, PNG, JPG ou WebP.',
      },
      { status: 400 }
    )
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Fichier trop volumineux (max 10 MB)' },
      { status: 400 }
    )
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const timestamp = Date.now()
  const safeName = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50)
  const filePath = `${utilisateur.entreprise_id}/factures-achat/${timestamp}_${safeName}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Generate a signed URL (valid 1 year) since the bucket is private
  const { data: signedData, error: signedError } = await supabase.storage
    .from('uploads')
    .createSignedUrl(filePath, 365 * 24 * 60 * 60) // 1 year

  if (signedError) {
    return NextResponse.json({ error: signedError.message }, { status: 500 })
  }

  return NextResponse.json({
    file_path: filePath,
    signed_url: signedData.signedUrl,
    file_name: file.name,
  })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user)
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { file_path } = await request.json()
  if (!file_path)
    return NextResponse.json({ error: 'Chemin fichier manquant' }, { status: 400 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('entreprise_id')
    .eq('id', user.id)
    .single()

  if (!utilisateur)
    return NextResponse.json(
      { error: 'Utilisateur introuvable' },
      { status: 404 }
    )

  // Verify the file belongs to the user's entreprise
  if (!file_path.startsWith(utilisateur.entreprise_id)) {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { error: deleteError } = await supabase.storage
    .from('uploads')
    .remove([file_path])

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
