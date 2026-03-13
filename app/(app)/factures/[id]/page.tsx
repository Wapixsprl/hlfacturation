import { createClient } from '@/lib/supabase/server'
import { FactureForm } from '@/components/factures/FactureForm'
import { notFound } from 'next/navigation'

export default async function EditFacturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get user's entreprise_id for payment config
  const { data: { user } } = await supabase.auth.getUser()
  const { data: utilisateur } = user
    ? await supabase.from('utilisateurs').select('entreprise_id').eq('id', user.id).single()
    : { data: null }

  const [
    { data: facture },
    { data: lignes },
    { data: clients },
    { data: produits },
    { data: devisAcceptes },
    { data: paiements },
    { data: paymentSessions },
    { data: entreprise },
  ] = await Promise.all([
    supabase.from('factures').select('*').eq('id', id).single(),
    supabase
      .from('factures_lignes')
      .select('*')
      .eq('facture_id', id)
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
    supabase
      .from('devis')
      .select('*, client:clients(id, nom, prenom, raison_sociale, type)')
      .in('statut', ['accepte'])
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('paiements_clients')
      .select('*')
      .eq('facture_id', id)
      .order('date_paiement', { ascending: false }),
    supabase
      .from('payment_sessions')
      .select('*')
      .eq('facture_id', id)
      .order('created_at', { ascending: false }),
    utilisateur
      ? supabase
          .from('entreprises')
          .select('payment_enabled, payment_provider')
          .eq('id', utilisateur.entreprise_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  if (!facture) notFound()

  const paymentEnabled = !!(entreprise?.payment_enabled && entreprise?.payment_provider && entreprise.payment_provider !== 'none')

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">
        Facture {facture.numero}
      </h1>
      <FactureForm
        facture={facture}
        initialLignes={lignes || []}
        initialPaiements={paiements || []}
        paymentSessions={paymentSessions || []}
        paymentEnabled={paymentEnabled}
        clients={clients || []}
        produits={produits || []}
        devisAcceptes={devisAcceptes || []}
      />
    </div>
  )
}
