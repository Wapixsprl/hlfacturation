import { createClient } from '@/lib/supabase/server'
import { FactureForm } from '@/components/factures/FactureForm'

export default async function NouvelleFacturePage({
  searchParams,
}: {
  searchParams: Promise<{ devis?: string; type?: string }>
}) {
  const { devis: preselectedDevisId, type: preselectedType } = await searchParams
  const supabase = await createClient()

  const [{ data: clients }, { data: produits }, { data: devisAcceptes }] = await Promise.all([
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
    supabase
      .from('devis')
      .select('*, client:clients(*)')
      .in('statut', ['accepte', 'envoye'])
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
  ])

  const pageTitle = preselectedType === 'avoir'
    ? 'Nouvelle note de credit'
    : preselectedType === 'acompte'
      ? 'Nouvelle facture d\'acompte'
      : 'Nouvelle facture'

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#141414] mb-6">{pageTitle}</h1>
      <FactureForm
        clients={clients || []}
        produits={produits || []}
        devisAcceptes={devisAcceptes || []}
        preselectedDevisId={preselectedDevisId}
        preselectedType={preselectedType}
      />
    </div>
  )
}
