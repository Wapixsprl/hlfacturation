import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { DEFAULT_PERMISSIONS, MANAGED_PAGES, MANAGED_ROLES } from '@/lib/auth/page-permissions'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('entreprise_id, role')
    .eq('id', user.id)
    .single()

  if (!utilisateur || utilisateur.role !== 'super_admin') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: rows } = await service
    .from('role_page_permissions')
    .select('role, page, actif')
    .eq('entreprise_id', utilisateur.entreprise_id)

  // Si aucune ligne en base → retourner les defaults
  if (!rows || rows.length === 0) {
    return NextResponse.json({ permissions: DEFAULT_PERMISSIONS, isDefault: true })
  }

  // Reconstruire la matrice depuis les lignes DB
  const permissions: Record<string, Record<string, boolean>> = {}
  for (const r of MANAGED_ROLES) {
    permissions[r.key] = {}
    for (const p of MANAGED_PAGES) {
      const row = rows.find(x => x.role === r.key && x.page === p.key)
      permissions[r.key][p.key] = row ? row.actif : (DEFAULT_PERMISSIONS[r.key]?.[p.key] ?? false)
    }
  }

  return NextResponse.json({ permissions, isDefault: false })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('entreprise_id, role')
    .eq('id', user.id)
    .single()

  if (!utilisateur || utilisateur.role !== 'super_admin') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const { permissions } = await request.json() as { permissions: Record<string, Record<string, boolean>> }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const rows = []
  for (const role of MANAGED_ROLES) {
    for (const page of MANAGED_PAGES) {
      rows.push({
        entreprise_id: utilisateur.entreprise_id,
        role: role.key,
        page: page.key,
        actif: permissions[role.key]?.[page.key] ?? false,
        updated_at: new Date().toISOString(),
      })
    }
  }

  const { error } = await service
    .from('role_page_permissions')
    .upsert(rows, { onConflict: 'entreprise_id,role,page' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
