import { createClient } from '@/lib/supabase/server'
import { ProduitsPageContent } from '@/components/produits/ProduitsPageContent'

export default async function ProduitsPage() {
  const supabase = await createClient()
  const { data: produits } = await supabase
    .from('produits')
    .select('*')
    .is('archived_at', null)
    .order('designation', { ascending: true })

  return <ProduitsPageContent initialProduits={produits || []} />
}
