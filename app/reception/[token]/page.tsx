import { createClient } from '@supabase/supabase-js'
import { ReceptionSignatureContent } from '@/components/reception/ReceptionSignatureContent'

export default async function ReceptionSignaturePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: pv } = await supabase
    .from('pv_reception')
    .select('*, chantier:chantiers(id, numero, titre, adresse, ville, client:clients(nom, prenom, raison_sociale, type))')
    .eq('token_signature', token)
    .single()

  if (!pv) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#DC2626] mb-2">PV non trouvé</h1>
          <p className="text-[#6B7280]">Ce lien n&apos;est plus valide ou a déjà été utilisé.</p>
        </div>
      </div>
    )
  }

  if (pv.signature_client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-emerald-600">&#10003;</span>
          </div>
          <h1 className="text-xl font-bold text-emerald-600 mb-2">PV déjà signé</h1>
          <p className="text-[#6B7280]">Ce procès-verbal de réception a déjà été signé.</p>
        </div>
      </div>
    )
  }

  if (pv.token_expiration && new Date(pv.token_expiration) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-amber-600 mb-2">Lien expiré</h1>
          <p className="text-[#6B7280]">Ce lien de signature a expiré. Contactez HL Rénovation.</p>
        </div>
      </div>
    )
  }

  return <ReceptionSignatureContent pv={pv} token={token} />
}
