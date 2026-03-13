import createMollieClient from '@mollie/api-client'
import type { PaymentProvider, CreatePaymentParams, CreatePaymentResult, PaymentStatusResult } from './types'

export class MollieProvider implements PaymentProvider {
  private client: ReturnType<typeof createMollieClient>

  constructor(apiKey: string) {
    this.client = createMollieClient({ apiKey })
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    // Mollie exige le montant au format string avec 2 decimales
    const amountStr = params.amount.toFixed(2)

    const payment = await this.client.payments.create({
      amount: {
        currency: 'EUR',
        value: amountStr,
      },
      description: params.description,
      redirectUrl: params.redirectUrl,
      webhookUrl: params.webhookUrl,
      metadata: JSON.stringify(params.metadata),
    })

    const checkoutUrl = payment.getCheckoutUrl()
    if (!checkoutUrl) {
      throw new Error('Mollie n\'a pas retourne d\'URL de checkout')
    }

    return {
      providerPaymentId: payment.id,
      checkoutUrl,
    }
  }

  async getPaymentStatus(providerPaymentId: string): Promise<PaymentStatusResult> {
    const payment = await this.client.payments.get(providerPaymentId)

    // Mapping des statuts Mollie vers nos statuts internes
    let status: PaymentStatusResult['status']
    switch (payment.status) {
      case 'paid':
        status = 'paid'
        break
      case 'pending':
      case 'authorized':
      case 'open':
        status = 'pending'
        break
      case 'failed':
        status = 'failed'
        break
      case 'expired':
        status = 'expired'
        break
      case 'canceled':
        status = 'canceled'
        break
      default:
        status = 'pending'
    }

    return {
      status,
      amount: parseFloat(payment.amount.value),
      paidAt: payment.paidAt || undefined,
    }
  }

  /**
   * Teste la connexion en listant les methodes de paiement.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.methods.list()
      return true
    } catch {
      return false
    }
  }
}
