import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { PaymentPageContent } from '@/components/paiement/PaymentPageContent'

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Service role pour bypass RLS (page publique)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Chercher la session par token
  const { data: session } = await supabase
    .from('payment_sessions')
    .select('*')
    .eq('token', token)
    .single()

  if (!session) notFound()

  // Recuperer facture + client + entreprise
  const [{ data: facture }, { data: entreprise }] = await Promise.all([
    supabase
      .from('factures')
      .select('numero, total_ttc, solde_ttc, client:clients(nom, prenom, raison_sociale, type, email)')
      .eq('id', session.facture_id)
      .single(),
    supabase
      .from('entreprises')
      .select('nom, logo_url, telephone, email')
      .eq('id', session.entreprise_id)
      .single(),
  ])

  if (!facture || !entreprise) notFound()

  // Verifier expiration
  const isExpired = new Date(session.token_expiration) < new Date()
  const isPaid = session.statut === 'paid'
  const isFailed = session.statut === 'failed' || session.statut === 'canceled'

  // Nom du client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientData = facture.client as any
  const client = Array.isArray(clientData) ? clientData[0] : clientData as { nom: string | null; prenom: string | null; raison_sociale: string | null; type: string; email: string | null } | null
  const clientName = client?.type === 'professionnel' && client?.raison_sociale
    ? client.raison_sociale
    : [client?.prenom, client?.nom].filter(Boolean).join(' ') || 'Client'

  return (
    <PaymentPageContent
      session={{
        id: session.id,
        montant: session.montant,
        statut: session.statut,
        checkout_url: session.checkout_url,
        provider: session.provider,
      }}
      facture={{
        numero: facture.numero,
        total_ttc: facture.total_ttc,
      }}
      entreprise={{
        nom: entreprise.nom,
        logo_url: entreprise.logo_url,
        telephone: entreprise.telephone,
        email: entreprise.email,
      }}
      clientName={clientName}
      isExpired={isExpired}
      isPaid={isPaid}
      isFailed={isFailed}
    />
  )
}
