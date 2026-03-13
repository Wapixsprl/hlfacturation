import { createClient } from '@/lib/supabase/server'
import { DevisForm } from '@/components/devis/DevisForm'
import { notFound } from 'next/navigation'

export default async function EditDevisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: devis }, { data: lignes }, { data: clients }, { data: produits }] =
    await Promise.all([
      supabase.from('devis').select('*').eq('id', id).single(),
      supabase
        .from('devis_lignes')
        .select('*')
        .eq('devis_id', id)
        .order('ordre'),
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

  if (!devis) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">
        Devis {devis.numero}
      </h1>
      <DevisForm
        devis={devis}
        initialLignes={lignes || []}
        clients={clients || []}
        produits={produits || []}
      />
    </div>
  )
}
