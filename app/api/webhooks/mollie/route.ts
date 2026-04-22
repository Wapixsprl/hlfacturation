import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MollieProvider } from '@/lib/payments/mollie'
import { decryptApiKey, mollieWebhookSig } from '@/lib/payments/encryption'
import { recordPaymentAndUpdateInvoice, updateSessionStatus } from '../shared'

export async function POST(request: NextRequest) {
  try {
    // Mollie envoie l'ID du paiement dans le body
    const body = await request.text()
    const formData = new URLSearchParams(body)
    const molliePaymentId = formData.get('id')

    if (!molliePaymentId) {
      console.error('[mollie webhook] Pas d\'ID de paiement dans le body')
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    console.log(`[mollie webhook] Notification pour paiement: ${molliePaymentId}`)

    // Chercher la session en base
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: session } = await serviceSupabase
      .from('payment_sessions')
      .select('*, facture:factures(entreprise_id)')
      .eq('provider_payment_id', molliePaymentId)
      .eq('provider', 'mollie')
      .single()

    if (!session) {
      console.error(`[mollie webhook] Session non trouvee pour: ${molliePaymentId}`)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verifier la signature HMAC dans l'URL
    const sig = request.nextUrl.searchParams.get('sig')
    const entreprise = session.facture as { entreprise_id: string }
    const expectedSig = mollieWebhookSig(entreprise.entreprise_id)
    if (!sig || sig !== expectedSig) {
      console.error('[mollie webhook] Signature invalide')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Recuperer la cle API Mollie pour verifier le statut
    const { data: ent } = await serviceSupabase
      .from('entreprises')
      .select('mollie_api_key_encrypted')
      .eq('id', entreprise.entreprise_id)
      .single()

    if (!ent?.mollie_api_key_encrypted) {
      console.error('[mollie webhook] Cle API Mollie non trouvee')
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const apiKey = decryptApiKey(ent.mollie_api_key_encrypted)
    const mollie = new MollieProvider(apiKey)

    // Toujours verifier le statut cote serveur (securite)
    const paymentStatus = await mollie.getPaymentStatus(molliePaymentId)

    if (paymentStatus.status === 'paid') {
      await recordPaymentAndUpdateInvoice({
        sessionId: session.id,
        providerPaymentId: molliePaymentId,
        amount: paymentStatus.amount,
        paidAt: paymentStatus.paidAt || new Date().toISOString(),
        provider: 'mollie',
      })
    } else if (['failed', 'expired', 'canceled'].includes(paymentStatus.status)) {
      await updateSessionStatus(
        molliePaymentId,
        paymentStatus.status as 'failed' | 'expired' | 'canceled'
      )
    }

    // Mollie attend toujours un 200
    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[mollie webhook] Erreur:', message)
    // Retourner 200 pour eviter les retries inutiles en cas d'erreur de traitement
    return NextResponse.json({ received: true, error: message })
  }
}
