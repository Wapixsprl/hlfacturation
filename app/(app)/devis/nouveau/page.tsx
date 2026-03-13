import { createClient } from '@/lib/supabase/server'
import { DevisForm } from '@/components/devis/DevisForm'

export default async function NouveauDevisPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: produits }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('nom'),
    supabase
      .from('produits')
      .select('*')
      .is('archived_at', null)
      .eq('actif', true)
      .order('designation'),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">Nouveau devis</h1>
      <DevisForm clients={clients || []} produits={produits || []} />
    </div>
  )
}
