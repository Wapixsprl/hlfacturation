import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function PaymentRetourPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { token } = await params
  const { status: queryStatus } = await searchParams

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: session } = await supabase
    .from('payment_sessions')
    .select('statut, montant, provider')
    .eq('token', token)
    .single()

  if (!session) notFound()

  const isPaid = session.statut === 'paid'
  const isCanceled = queryStatus === 'cancel' || session.statut === 'canceled'
  const isPending = session.statut === 'pending' || session.statut === 'created'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-8 max-w-md w-full text-center">
        {isPaid ? (
          <>
            <div className="w-16 h-16 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-[#059669]" />
            </div>
            <h1 className="text-xl font-semibold text-[#111827] mb-2">Paiement confirme !</h1>
            <p className="text-[#6B7280] mb-1">
              Votre paiement de <span className="font-semibold text-[#111827]">{session.montant.toFixed(2)} EUR</span> a ete recu.
            </p>
            <p className="text-sm text-[#9CA3AF]">
              Un email de confirmation vous sera envoye.
            </p>
          </>
        ) : isCanceled ? (
          <>
            <div className="w-16 h-16 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-[#DC2626]" />
            </div>
            <h1 className="text-xl font-semibold text-[#111827] mb-2">Paiement annule</h1>
            <p className="text-[#6B7280] mb-4">
              Le paiement a ete annule. Aucun montant n&apos;a ete debite.
            </p>
            <Link
              href={`/payer/${token}`}
              className="inline-flex items-center gap-2 text-sm text-[#17C2D7] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Reessayer le paiement
            </Link>
          </>
        ) : isPending ? (
          <>
            <div className="w-16 h-16 bg-[#FEF3C7] rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-[#D97706] animate-pulse" />
            </div>
            <h1 className="text-xl font-semibold text-[#111827] mb-2">Paiement en cours de traitement</h1>
            <p className="text-[#6B7280] mb-1">
              Votre paiement est en cours de verification.
            </p>
            <p className="text-sm text-[#9CA3AF]">
              Vous recevrez un email de confirmation des que le paiement sera valide.
              Cela peut prendre quelques minutes.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-[#DC2626]" />
            </div>
            <h1 className="text-xl font-semibold text-[#111827] mb-2">Erreur de paiement</h1>
            <p className="text-[#6B7280]">
              Une erreur est survenue lors du traitement. Veuillez reessayer ou contacter l&apos;entreprise.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
