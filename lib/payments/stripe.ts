import Stripe from 'stripe'
import type { PaymentProvider, CreatePaymentParams, CreatePaymentResult, PaymentStatusResult } from './types'

export class StripeProvider implements PaymentProvider {
  private client: Stripe
  private webhookSecret?: string

  constructor(secretKey: string, webhookSecret?: string) {
    this.client = new Stripe(secretKey)
    this.webhookSecret = webhookSecret
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    // Stripe exige le montant en centimes (integer)
    const amountCents = Math.round(params.amount * 100)

    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'bancontact'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: {
              name: params.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: params.redirectUrl + '?status=success',
      cancel_url: params.redirectUrl + '?status=cancel',
      metadata: {
        facture_id: params.metadata.facture_id,
        entreprise_id: params.metadata.entreprise_id,
        payment_session_id: params.metadata.payment_session_id,
      },
    })

    if (!session.url) {
      throw new Error('Stripe n\'a pas retourne d\'URL de checkout')
    }

    return {
      providerPaymentId: session.id,
      checkoutUrl: session.url,
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const session = await this.client.checkout.sessions.retrieve(providerPaymentId)

    let status: PaymentStatusResult['status']
    switch (session.status) {
      case 'complete':
        status = session.payment_status === 'paid' ? 'paid' : 'pending'
        break
      case 'expired':
        status = 'expired'
        break
      case 'open':
        status = 'pending'
        break
      default:
        status = 'pending'
    }

    return {
      status,
      amount: (session.amount_total || 0) / 100,
      paidAt: session.status === 'complete' ? new Date().toISOString() : undefined,
      chargeId: session.payment_intent as string | undefined,
    }
  }

  /**
   * Verifie la signature d'un webhook Stripe.
   */
  verifyWebhookEvent(body: string, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new Error('Stripe webhook secret non configure')
    }
    return this.client.webhooks.constructEvent(body, signature, this.webhookSecret)
  }

  /**
   * Teste la connexion en listant les payment methods.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.paymentMethods.list({ limit: 1 })
      return true
    } catch {
      return false
    }
  }
}
