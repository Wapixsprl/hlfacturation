import { describe, it, expect } from 'vitest'
import { getPaymentProvider } from '@/lib/payments/factory'
import { StripeProvider } from '@/lib/payments/stripe'
import { MollieProvider } from '@/lib/payments/mollie'

describe('getPaymentProvider', () => {
  it("retourne une instance StripeProvider pour 'stripe'", () => {
    const provider = getPaymentProvider('stripe', 'sk_test_dummy')
    expect(provider).toBeInstanceOf(StripeProvider)
  })

  it("retourne une instance MollieProvider pour 'mollie'", () => {
    const provider = getPaymentProvider('mollie', 'test_api_key')
    expect(provider).toBeInstanceOf(MollieProvider)
  })

  it('le provider expose createPayment et getPaymentStatus', () => {
    const stripe = getPaymentProvider('stripe', 'sk_test_dummy')
    expect(typeof stripe.createPayment).toBe('function')
    expect(typeof stripe.getPaymentStatus).toBe('function')

    const mollie = getPaymentProvider('mollie', 'test_key')
    expect(typeof mollie.createPayment).toBe('function')
    expect(typeof mollie.getPaymentStatus).toBe('function')
  })

  it("lève une erreur pour un provider non supporté", () => {
    expect(() =>
      // @ts-expect-error — test intentionnel d'une valeur invalide
      getPaymentProvider('paypal', 'key')
    ).toThrow('Provider de paiement non supporte: paypal')
  })

  it('transmet le webhook secret à Stripe', () => {
    const provider = getPaymentProvider('stripe', 'sk_test_dummy', 'whsec_test')
    // verifyWebhookEvent doit exister (Stripe uniquement)
    expect(typeof (provider as StripeProvider).verifyWebhookEvent).toBe('function')
  })
})
