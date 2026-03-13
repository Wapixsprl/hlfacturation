import { createClient } from '@/lib/supabase/server'
import { FactureAchatForm } from '@/components/factures-achat/FactureAchatForm'
import { notFound } from 'next/navigation'

export default async function EditFactureAchatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: factureAchat },
    { data: echeances },
    { data: fournisseurs },
    { data: devis },
  ] = await Promise.all([
    supabase.from('factures_achat').select('*').eq('id', id).single(),
    supabase
      .from('echeances_fournisseurs')
      .select('*')
      .eq('facture_achat_id', id)
      .order('date_echeance'),
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

  if (!factureAchat) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-black mb-6">
        Facture d&apos;achat {factureAchat.numero_fournisseur || factureAchat.id.slice(0, 8)}
      </h1>
      <FactureAchatForm
        factureAchat={factureAchat}
        initialEcheances={echeances || []}
        fournisseurs={fournisseurs || []}
        devisList={devis || []}
      />
    </div>
  )
}
