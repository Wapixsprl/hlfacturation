import { createClient } from '@supabase/supabase-js'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Enregistre un paiement et met a jour le statut de la facture.
 * Gere l'idempotence (pas de doublon si webhook rejoue).
 */
export async function recordPaymentAndUpdateInvoice(params: {
  sessionId: string
  providerPaymentId: string
  amount: number
  paidAt: string
  provider: 'mollie' | 'stripe'
  chargeId?: string
}) {
  const { sessionId, providerPaymentId, amount, paidAt, provider, chargeId } = params

  // 1. Recuperer la session
  const { data: session } = await serviceSupabase
    .from('payment_sessions')
    .select('*, facture:factures(id, entreprise_id, solde_ttc, client_id)')
    .eq('id', sessionId)
    .single()

  if (!session) {
    console.error(`[webhook] Session non trouvee: ${sessionId}`)
    return { success: false, reason: 'session_not_found' }
  }

  // 2. Idempotence : verifier si deja enregistre
  const { data: existingPaiement } = await serviceSupabase
    .from('paiements_clients')
    .select('id')
    .eq('payment_session_id', sessionId)
    .maybeSingle()

  if (existingPaiement) {
    console.log(`[webhook] Paiement deja enregistre pour session ${sessionId}`)
    return { success: true, reason: 'already_recorded' }
  }

  // 3. Mettre a jour la session
  await serviceSupabase
    .from('payment_sessions')
    .update({
      statut: 'paid',
      paid_at: paidAt,
      provider_payment_id: providerPaymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  const facture = session.facture as { id: string; entreprise_id: string; solde_ttc: number; client_id: string }

  // 4. Inserer le paiement client
  await serviceSupabase
    .from('paiements_clients')
    .insert({
      entreprise_id: facture.entreprise_id,
      facture_id: facture.id,
      date_paiement: new Date(paidAt).toISOString().split('T')[0],
      montant: amount,
      mode: provider,
      reference_bancaire: providerPaymentId,
      notes: `Paiement en ligne via ${provider === 'mollie' ? 'Mollie' : 'Stripe'}`,
      payment_session_id: sessionId,
    })

  // 5. Recalculer le statut de la facture
  const { data: allPaiements } = await serviceSupabase
    .from('paiements_clients')
    .select('montant')
    .eq('facture_id', facture.id)

  const totalPaye = (allPaiements || []).reduce((sum, p) => sum + p.montant, 0)
  const round = (n: number) => Math.round(n * 100) / 100
  const newStatut = round(totalPaye) >= round(facture.solde_ttc)
    ? 'payee'
    : 'partiellement_payee'

  await serviceSupabase
    .from('factures')
    .update({
      statut: newStatut,
      updated_at: new Date().toISOString(),
    })
    .eq('id', facture.id)

  // 6. Inserer mouvement de tresorerie
  await serviceSupabase
    .from('mouvements_tresorerie')
    .insert({
      entreprise_id: facture.entreprise_id,
      date_mouvement: new Date(paidAt).toISOString().split('T')[0],
      libelle: `Paiement en ligne ${provider} - Facture ${session.facture_id}`,
      montant: amount,
      type: 'encaissement_client',
      facture_id: facture.id,
      reference_bancaire: providerPaymentId,
    })

  console.log(`[webhook] Paiement enregistre: ${amount}EUR pour facture ${facture.id} via ${provider}`)

  return { success: true, reason: 'recorded', newStatut }
}

/**
 * Met a jour le statut d'une session de paiement (echec, expire, annule)
 */
export async function updateSessionStatus(
  providerPaymentId: string,
  statut: 'failed' | 'expired' | 'canceled',
  errorMessage?: string
) {
  await serviceSupabase
    .from('payment_sessions')
    .update({
      statut,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('provider_payment_id', providerPaymentId)
}
