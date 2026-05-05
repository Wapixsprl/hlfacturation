import { createClient } from '@/lib/supabase/server'
import { ProduitsPageContent } from '@/components/produits/ProduitsPageContent'
import { getPageAccess } from '@/lib/auth/getPageAccess'

export default async function ProduitsPage() {
  const [supabase, access] = await Promise.all([
    createClient(),
    getPageAccess(),
  ])
  const canViewDashboard = !access || access.role === 'super_admin' || access.pageAccess.includes('dashboard')

  const { data: produits } = await supabase
    .from('produits')
    .select('*')
    .is('archived_at', null)
    .order('designation', { ascending: true })

  return <ProduitsPageContent initialProduits={produits || []} canViewDashboard={canViewDashboard} />
}
