import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { MollieProvider } from '@/lib/payments/mollie'
import { StripeProvider } from '@/lib/payments/stripe'
import { encryptApiKey, decryptApiKey } from '@/lib/payments/encryption'

// POST — Tester la connexion avec un provider
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    // Verifier role super_admin
    const { data: utilisateur } = await supabase
      .from('utilisateurs')
      .select('role, entreprise_id')
      .eq('id', user.id)
      .single()
    if (!utilisateur || utilisateur.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 })
    }

    const body = await request.json()
    const { provider, apiKey } = body

    let keyToTest = apiKey

    // Si pas de cle fournie, utiliser celle en base
    if (!keyToTest) {
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: entreprise } = await serviceSupabase
        .from('entreprises')
        .select('mollie_api_key_encrypted, stripe_secret_key_encrypted')
        .eq('id', utilisateur.entreprise_id)
        .single()

      if (provider === 'mollie' && entreprise?.mollie_api_key_encrypted) {
        keyToTest = decryptApiKey(entreprise.mollie_api_key_encrypted)
      } else if (provider === 'stripe' && entreprise?.stripe_secret_key_encrypted) {
        keyToTest = decryptApiKey(entreprise.stripe_secret_key_encrypted)
      }
    }

    if (!keyToTest) {
      return NextResponse.json({ error: 'Aucune cle API configuree' }, { status: 400 })
    }

    if (provider === 'mollie') {
      const mollie = new MollieProvider(keyToTest)
      const ok = await mollie.testConnection()
      if (ok) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ success: false, error: 'Cle API Mollie invalide' })
      }
    } else if (provider === 'stripe') {
      const stripe = new StripeProvider(keyToTest)
      const ok = await stripe.testConnection()
      if (ok) {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ success: false, error: 'Cle API Stripe invalide' })
      }
    }

    return NextResponse.json({ error: 'Provider invalide' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT — Sauvegarder les parametres de paiement
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { data: utilisateur } = await supabase
      .from('utilisateurs')
      .select('role, entreprise_id')
      .eq('id', user.id)
      .single()
    if (!utilisateur || utilisateur.role !== 'super_admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 })
    }

    const body = await request.json()
    const {
      payment_enabled,
      payment_provider,
      mollie_api_key,
      stripe_secret_key,
      stripe_webhook_secret,
    } = body

    // Construire l'update
    const update: Record<string, unknown> = {
      payment_enabled: !!payment_enabled,
      payment_provider: payment_provider || 'none',
      updated_at: new Date().toISOString(),
    }

    // Chiffrer les cles si fournies
    if (mollie_api_key) {
      update.mollie_api_key_encrypted = encryptApiKey(mollie_api_key)
    }
    if (stripe_secret_key) {
      update.stripe_secret_key_encrypted = encryptApiKey(stripe_secret_key)
    }
    if (stripe_webhook_secret) {
      update.stripe_webhook_secret_encrypted = encryptApiKey(stripe_webhook_secret)
    }

    // Utiliser service role pour contourner RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await serviceSupabase
      .from('entreprises')
      .update(update)
      .eq('id', utilisateur.entreprise_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
