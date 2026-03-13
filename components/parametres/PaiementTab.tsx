'use client'

import { useState } from 'react'
import type { Entreprise } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Save, Eye, EyeOff, CheckCircle, XCircle, Zap } from 'lucide-react'

interface Props {
  entreprise: Entreprise
}

export function PaiementTab({ entreprise }: Props) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)

  const [enabled, setEnabled] = useState(entreprise.payment_enabled || false)
  const [provider, setProvider] = useState<'mollie' | 'stripe'>(
    entreprise.payment_provider === 'stripe' ? 'stripe' : 'mollie'
  )
  const [mollieKey, setMollieKey] = useState('')
  const [stripeKey, setStripeKey] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')
  const [showMollieKey, setShowMollieKey] = useState(false)
  const [showStripeKey, setShowStripeKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  const hasMollieKey = !!entreprise.mollie_api_key_encrypted
  const hasStripeKey = !!entreprise.stripe_secret_key_encrypted

  const handleTestConnection = async () => {
    const key = provider === 'mollie' ? mollieKey : stripeKey
    if (!key && !((provider === 'mollie' && hasMollieKey) || (provider === 'stripe' && hasStripeKey))) {
      toast.error('Veuillez entrer une cle API')
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/settings/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: key || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult('success')
        toast.success('Connexion reussie !')
      } else {
        setTestResult('error')
        toast.error(data.error || 'Echec de la connexion')
      }
    } catch {
      setTestResult('error')
      toast.error('Erreur lors du test')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/test-payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_enabled: enabled,
          payment_provider: enabled ? provider : 'none',
          mollie_api_key: mollieKey || undefined,
          stripe_secret_key: stripeKey || undefined,
          stripe_webhook_secret: stripeWebhookSecret || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la sauvegarde')
      } else {
        toast.success('Parametres de paiement sauvegardes')
        // Reset champs pour ne pas re-envoyer les cles
        setMollieKey('')
        setStripeKey('')
        setStripeWebhookSecret('')
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-[#E5E7EB]">
      <CardHeader>
        <CardTitle className="text-[#111827]">Paiement en ligne</CardTitle>
        <CardDescription>
          Permettez a vos clients de payer leurs factures en ligne via Mollie ou Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle activation */}
        <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
          <div>
            <p className="font-medium text-[#111827]">Activer le paiement en ligne</p>
            <p className="text-sm text-[#6B7280]">
              Un lien de paiement sera inclus automatiquement dans les emails de facturation
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-[#059669]' : 'bg-[#D1D5DB]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <>
            {/* Choix provider */}
            <div className="space-y-3">
              <Label className="text-[#111827] font-medium">Fournisseur de paiement</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider('mollie')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    provider === 'mollie'
                      ? 'border-[#17C2D7] bg-[#17C2D7]/5'
                      : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#111827]">Mollie</span>
                    <Badge className="bg-[#059669]/10 text-[#059669] text-[10px]">Recommande</Badge>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    Bancontact, Visa, Mastercard, iDEAL, virement
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider('stripe')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    provider === 'stripe'
                      ? 'border-[#17C2D7] bg-[#17C2D7]/5'
                      : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#111827]">Stripe</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    Carte bancaire, Bancontact, Apple Pay, Google Pay
                  </p>
                </button>
              </div>
            </div>

            {/* Champs Mollie */}
            {provider === 'mollie' && (
              <div className="space-y-3">
                <Label htmlFor="mollie-key" className="text-[#111827] font-medium">
                  Cle API Mollie
                  {hasMollieKey && (
                    <Badge className="ml-2 bg-[#059669]/10 text-[#059669] text-[10px]">Configuree</Badge>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="mollie-key"
                    type={showMollieKey ? 'text' : 'password'}
                    value={mollieKey}
                    onChange={(e) => setMollieKey(e.target.value)}
                    placeholder={hasMollieKey ? 'Laisser vide pour garder la cle actuelle' : 'test_xxx ou live_xxx'}
                    className="pr-10 border-[#E5E7EB] focus:border-[#17C2D7]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMollieKey(!showMollieKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                  >
                    {showMollieKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Trouvez votre cle API dans le dashboard Mollie &gt; Developers &gt; API keys
                </p>
              </div>
            )}

            {/* Champs Stripe */}
            {provider === 'stripe' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="stripe-key" className="text-[#111827] font-medium">
                    Cle secrete Stripe
                    {hasStripeKey && (
                      <Badge className="ml-2 bg-[#059669]/10 text-[#059669] text-[10px]">Configuree</Badge>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="stripe-key"
                      type={showStripeKey ? 'text' : 'password'}
                      value={stripeKey}
                      onChange={(e) => setStripeKey(e.target.value)}
                      placeholder={hasStripeKey ? 'Laisser vide pour garder la cle actuelle' : 'sk_test_xxx ou sk_live_xxx'}
                      className="pr-10 border-[#E5E7EB] focus:border-[#17C2D7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStripeKey(!showStripeKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                    >
                      {showStripeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="stripe-webhook" className="text-[#111827] font-medium">
                    Secret webhook Stripe
                  </Label>
                  <div className="relative">
                    <Input
                      id="stripe-webhook"
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={stripeWebhookSecret}
                      onChange={(e) => setStripeWebhookSecret(e.target.value)}
                      placeholder="whsec_xxx"
                      className="pr-10 border-[#E5E7EB] focus:border-[#17C2D7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Dashboard Stripe &gt; Developers &gt; Webhooks &gt; Endpoint secret
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
                className="border-[#E5E7EB]"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Tester la connexion
              </Button>
              {testResult === 'success' && (
                <span className="flex items-center gap-1 text-sm text-[#059669]">
                  <CheckCircle className="h-4 w-4" /> Connexion OK
                </span>
              )}
              {testResult === 'error' && (
                <span className="flex items-center gap-1 text-sm text-[#DC2626]">
                  <XCircle className="h-4 w-4" /> Echec
                </span>
              )}
            </div>
          </>
        )}

        {/* Save */}
        <div className="pt-4 border-t border-[#E5E7EB]">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
