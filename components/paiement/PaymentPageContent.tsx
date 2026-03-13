'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, Clock, XCircle, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  session: {
    id: string
    montant: number
    statut: string
    checkout_url: string | null
    provider: string
  }
  facture: {
    numero: string
    total_ttc: number
  }
  entreprise: {
    nom: string
    logo_url: string | null
    telephone: string | null
    email: string | null
  }
  clientName: string
  isExpired: boolean
  isPaid: boolean
  isFailed: boolean
}

export function PaymentPageContent({
  session,
  facture,
  entreprise,
  clientName,
  isExpired,
  isPaid,
  isFailed,
}: Props) {
  const [redirecting, setRedirecting] = useState(false)

  const formatMontant = (n: number) =>
    new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

  const handlePay = () => {
    if (!session.checkout_url) return
    setRedirecting(true)
    window.location.href = session.checkout_url
  }

  // Page de succes
  if (isPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-[#059669]" />
          </div>
          <h1 className="text-xl font-semibold text-[#111827] mb-2">Paiement deja effectue</h1>
          <p className="text-[#6B7280]">
            Le paiement pour la facture <span className="font-semibold">{facture.numero}</span> a deja ete recu. Merci !
          </p>
        </div>
      </div>
    )
  }

  // Page d'expiration
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-8 w-8 text-[#D97706]" />
          </div>
          <h1 className="text-xl font-semibold text-[#111827] mb-2">Lien expire</h1>
          <p className="text-[#6B7280] mb-4">
            Ce lien de paiement a expire. Veuillez contacter {entreprise.nom} pour obtenir un nouveau lien.
          </p>
          {entreprise.email && (
            <p className="text-sm text-[#9CA3AF]">
              Contact : {entreprise.email}
              {entreprise.telephone && ` — ${entreprise.telephone}`}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Page d'echec
  if (isFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-[#DC2626]" />
          </div>
          <h1 className="text-xl font-semibold text-[#111827] mb-2">Paiement echoue</h1>
          <p className="text-[#6B7280] mb-4">
            Le paiement n&apos;a pas pu etre traite. Veuillez contacter {entreprise.nom}.
          </p>
          {entreprise.email && (
            <p className="text-sm text-[#9CA3AF]">
              Contact : {entreprise.email}
              {entreprise.telephone && ` — ${entreprise.telephone}`}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Page de paiement principale
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] max-w-md w-full overflow-hidden">
        {/* Header avec branding */}
        <div className="bg-[#1E2028] px-6 py-5 text-center">
          {entreprise.logo_url ? (
            <Image
              src={entreprise.logo_url}
              alt={entreprise.nom}
              width={140}
              height={40}
              className="mx-auto mb-2 object-contain brightness-0 invert"
            />
          ) : (
            <h2 className="text-white text-lg font-semibold">{entreprise.nom}</h2>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Details facture */}
          <div className="text-center">
            <p className="text-sm text-[#6B7280] mb-1">Facture {facture.numero}</p>
            <p className="text-3xl font-bold text-[#111827] tabular-nums">
              {formatMontant(session.montant)}
            </p>
            {session.montant !== facture.total_ttc && (
              <p className="text-xs text-[#9CA3AF] mt-1">
                (sur un total de {formatMontant(facture.total_ttc)})
              </p>
            )}
          </div>

          {/* Info client */}
          <div className="bg-[#F9FAFB] rounded-lg p-4 text-center">
            <p className="text-sm text-[#6B7280]">
              Paiement pour <span className="font-medium text-[#111827]">{clientName}</span>
            </p>
          </div>

          {/* Methode de paiement */}
          <div className="flex items-center justify-center gap-2 text-sm text-[#9CA3AF]">
            <CreditCard className="h-4 w-4" />
            <span>
              {session.provider === 'mollie'
                ? 'Bancontact, Visa, Mastercard, virement'
                : 'Carte bancaire, Bancontact, Apple Pay'}
            </span>
          </div>

          {/* Bouton payer */}
          <Button
            onClick={handlePay}
            disabled={redirecting || !session.checkout_url}
            className="w-full h-12 bg-[#059669] hover:bg-[#047857] text-white text-base font-semibold rounded-xl shadow-sm"
          >
            {redirecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Redirection...
              </>
            ) : (
              <>Payer {formatMontant(session.montant)}</>
            )}
          </Button>

          {/* Securite */}
          <p className="text-xs text-center text-[#9CA3AF]">
            Paiement securise via {session.provider === 'mollie' ? 'Mollie' : 'Stripe'}.
            Vos donnees bancaires ne sont jamais stockees sur nos serveurs.
          </p>
        </div>
      </div>
    </div>
  )
}
