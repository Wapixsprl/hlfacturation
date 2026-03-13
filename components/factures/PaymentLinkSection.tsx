'use client'

import { useState } from 'react'
import { formatMontant, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Copy, ExternalLink, Link2, Loader2, RefreshCw } from 'lucide-react'
import type { PaymentSession } from '@/types/database'

interface Props {
  factureId: string
  factureStatut: string
  paymentSessions: PaymentSession[]
  paymentEnabled: boolean
}

const statutLabels: Record<string, { label: string; variant: string }> = {
  created: { label: 'Cree', variant: 'bg-gray-100 text-gray-700' },
  pending: { label: 'En attente', variant: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Paye', variant: 'bg-green-100 text-green-700' },
  failed: { label: 'Echoue', variant: 'bg-red-100 text-red-700' },
  expired: { label: 'Expire', variant: 'bg-gray-100 text-gray-500' },
  canceled: { label: 'Annule', variant: 'bg-red-100 text-red-600' },
}

export function PaymentLinkSection({
  factureId,
  factureStatut,
  paymentSessions,
  paymentEnabled,
}: Props) {
  const [generating, setGenerating] = useState(false)
  const [sessions, setSessions] = useState<PaymentSession[]>(paymentSessions)

  // Find active session (created or pending, not expired)
  const activeSession = sessions.find(
    (s) =>
      (s.statut === 'created' || s.statut === 'pending') &&
      new Date(s.token_expiration) > new Date()
  )

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const activePaymentUrl = activeSession ? `${appUrl}/payer/${activeSession.token}` : null

  const canGenerate =
    paymentEnabled &&
    !activeSession &&
    factureStatut !== 'brouillon' &&
    factureStatut !== 'payee'

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/factures/${factureId}/payment-link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la creation du lien')
        return
      }

      toast.success('Lien de paiement genere')

      // Refresh sessions
      const newSession: PaymentSession = {
        id: data.sessionId,
        entreprise_id: '',
        facture_id: factureId,
        provider: data.provider || 'mollie',
        provider_payment_id: null,
        montant: data.montant,
        devise: 'EUR',
        statut: 'pending',
        checkout_url: data.checkoutUrl,
        token: data.paymentUrl?.split('/payer/')[1] || '',
        token_expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: null,
        user_agent: null,
        paid_at: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSessions((prev) => [newSession, ...prev])
    } catch {
      toast.error('Erreur lors de la creation du lien de paiement')
    }
    setGenerating(false)
  }

  const handleCopy = async () => {
    if (!activePaymentUrl) return
    try {
      await navigator.clipboard.writeText(activePaymentUrl)
      toast.success('Lien copie dans le presse-papiers')
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

  if (!paymentEnabled && sessions.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Paiement en ligne
        </CardTitle>
        <CardAction>
          {canGenerate && (
            <Button
              type="button"
              size="sm"
              className="bg-[#059669] hover:bg-[#047857] text-white"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Generer un lien
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active link */}
        {activeSession && activePaymentUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-800">Lien actif</p>
              <Badge className={statutLabels[activeSession.statut]?.variant || 'bg-gray-100 text-gray-700'}>
                {statutLabels[activeSession.statut]?.label || activeSession.statut}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border rounded px-3 py-2 text-gray-600 truncate">
                {activePaymentUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                title="Copier le lien"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(activePaymentUrl, '_blank')}
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-green-600 mt-2">
              Montant : {formatMontant(activeSession.montant)} — Expire le{' '}
              {formatDate(activeSession.token_expiration)}
            </p>
          </div>
        )}

        {!paymentEnabled && sessions.length > 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Le paiement en ligne est desactive. Activez-le dans les parametres pour generer de nouveaux liens.
          </p>
        )}

        {/* History */}
        {sessions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Historique des sessions
            </p>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">
                        {formatDate(s.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatMontant(s.montant)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-gray-100 text-gray-700 capitalize">
                          {s.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statutLabels[s.statut]?.variant || 'bg-gray-100 text-gray-700'}>
                          {statutLabels[s.statut]?.label || s.statut}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {sessions.length === 0 && paymentEnabled && factureStatut !== 'brouillon' && (
          <p className="text-center text-muted-foreground py-4 text-sm">
            Aucune session de paiement. Un lien sera genere automatiquement lors de l&apos;envoi de la facture.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
