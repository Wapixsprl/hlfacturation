import type { PaymentProvider } from './types'
import { MollieProvider } from './mollie'
import { StripeProvider } from './stripe'

/**
 * Factory pour obtenir le bon provider de paiement.
 */
export function getPaymentProvider(
  provider: 'mollie' | 'stripe',
  apiKey: string,
  webhookSecret?: string
): PaymentProvider {
  switch (provider) {
    case 'mollie':
      return new MollieProvider(apiKey)
    case 'stripe':
      return new StripeProvider(apiKey, webhookSecret)
    default:
      throw new Error(`Provider de paiement non supporte: ${provider}`)
  }
}
