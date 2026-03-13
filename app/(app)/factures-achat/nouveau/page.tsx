import { createClient } from '@/lib/supabase/server'
import { FactureAchatForm } from '@/components/factures-achat/FactureAchatForm'

export default async function NouvelleFactureAchatPage() {
  const supabase = await createClient()

  const [{ data: fournisseurs }, { data: devis }] = await Promise.all([
    supabase
      .from('fournisseurs')
      .select('*')
      .is('archived_at', null)
      .order('raison_sociale'),
    supabase
      .from('devis')
      .select('id, numero, titre, client_id, clients(nom, prenom, raison_sociale)')
      .in('statut', ['accepte', 'converti'])
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">
        Nouvelle facture d&apos;achat
      </h1>
      <FactureAchatForm
        fournisseurs={fournisseurs || []}
        devisList={devis || []}
      />
    </div>
  )
}
