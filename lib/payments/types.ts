export interface CreatePaymentParams {
  /** Montant en EUR, ex: 1250.50 */
  amount: number
  /** Description affichee au client, ex: "Facture FAC-2026-0042" */
  description: string
  /** URL de retour apres paiement */
  redirectUrl: string
  /** URL du webhook pour notifications de statut */
  webhookUrl: string
  /** Metadata pour tracer le paiement */
  metadata: {
    facture_id: string
    entreprise_id: string
    payment_session_id: string
  }
}

export interface CreatePaymentResult {
  /** ID du paiement chez le provider (Mollie payment ID ou Stripe session ID) */
  providerPaymentId: string
  /** URL de la page de checkout hebergee */
  checkoutUrl: string
}

export interface PaymentStatusResult {
  status: 'paid' | 'pending' | 'failed' | 'expired' | 'canceled'
  /** Montant reellement paye */
  amount: number
  /** Date du paiement */
  paidAt?: string
  /** ID de charge Stripe (pour eventuels remboursements) */
  chargeId?: string
}

export interface PaymentProvider {
  /** Creer un paiement et obtenir l'URL de checkout */
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>
  /** Recuperer le statut d'un paiement */
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult>
}
