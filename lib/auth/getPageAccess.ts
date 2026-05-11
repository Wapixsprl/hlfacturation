import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { DEFAULT_PERMISSIONS } from './page-permissions'

const PAGE_ROUTE_MAP: Record<string, string> = {
  clients: '/clients',
  produits: '/produits',
  devis: '/devis',
  factures: '/factures',
  chantiers: '/chantiers',
  planning: '/planning',
  fournisseurs: '/fournisseurs',
  achats: '/factures-achat',
  tresorerie: '/tresorerie',
}

export async function getPageAccess(): Promise<{ pageAccess: string[]; role: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('role, entreprise_id')
    .eq('id', user.id)
    .single()

  if (!utilisateur) return null

  if (utilisateur.role === 'super_admin') {
    return { pageAccess: Object.keys(PAGE_ROUTE_MAP).concat('dashboard'), role: 'super_admin' }
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: permRows } = await service
    .from('role_page_permissions')
    .select('page, actif')
    .eq('entreprise_id', utilisateur.entreprise_id)
    .eq('role', utilisateur.role)

  let pageAccess: string[]
  if (permRows && permRows.length > 0) {
    pageAccess = permRows.filter(r => r.actif).map(r => r.page)
  } else {
    const defaults = DEFAULT_PERMISSIONS[utilisateur.role] || {}
    pageAccess = Object.entries(defaults).filter(([, v]) => v).map(([k]) => k)
  }

  return { pageAccess, role: utilisateur.role }
}

export function getFirstAccessibleRoute(pageAccess: string[]): string {
  for (const page of pageAccess) {
    if (page !== 'dashboard' && PAGE_ROUTE_MAP[page]) {
      return PAGE_ROUTE_MAP[page]
    }
  }
  return '/parametres'
}
