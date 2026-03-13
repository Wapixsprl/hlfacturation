import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { decryptApiKey } from '@/lib/payments/encryption'
import { recordPaymentAndUpdateInvoice, updateSessionStatus } from '../shared'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[stripe webhook] Pas de signature Stripe')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // On doit trouver le bon webhook secret — on cherche via les metadata
    // D'abord, parser l'event sans verification pour obtenir l'entreprise_id
    let rawEvent: { type: string; data: { object: Record<string, unknown> } }
    try {
      rawEvent = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const sessionObj = rawEvent.data?.object as Record<string, unknown>
    const metadata = sessionObj?.metadata as Record<string, string> | undefined
    const entrepriseId = metadata?.entreprise_id

    if (!entrepriseId) {
      console.error('[stripe webhook] Pas d\'entreprise_id dans les metadata')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    // Recuperer les cles Stripe de l'entreprise
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: ent } = await serviceSupabase
      .from('entreprises')
      .select('stripe_secret_key_encrypted, stripe_webhook_secret_encrypted')
      .eq('id', entrepriseId)
      .single()

    if (!ent?.stripe_secret_key_encrypted || !ent?.stripe_webhook_secret_encrypted) {
      console.error('[stripe webhook] Cles Stripe non trouvees')
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const secretKey = decryptApiKey(ent.stripe_secret_key_encrypted)
    const webhookSecret = decryptApiKey(ent.stripe_webhook_secret_encrypted)

    // Verifier la signature
    const stripe = new Stripe(secretKey)
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('[stripe webhook] Signature invalide:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`[stripe webhook] Event: ${event.type}`)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const paymentSessionId = session.metadata?.payment_session_id

      if (!paymentSessionId) {
        console.error('[stripe webhook] Pas de payment_session_id')
        return NextResponse.json({ received: true })
      }

      const amountTotal = (session.amount_total || 0) / 100

      await recordPaymentAndUpdateInvoice({
        sessionId: paymentSessionId,
        providerPaymentId: session.id,
        amount: amountTotal,
        paidAt: new Date().toISOString(),
        provider: 'stripe',
        chargeId: session.payment_intent as string | undefined,
      })
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session
      await updateSessionStatus(session.id, 'expired')
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[stripe webhook] Erreur:', message)
    return NextResponse.json({ received: true, error: message })
  }
}
