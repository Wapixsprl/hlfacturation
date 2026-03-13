import { createClient } from '@supabase/supabase-js'
import { SignaturePageContent } from '@/components/signature/SignaturePageContent'
import { notFound } from 'next/navigation'

export default async function SignatureDevisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Use service role to bypass RLS (this is a public page, no auth)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch devis by signature token (public access via RLS or service role)
  const { data: devis } = await supabase
    .from('devis')
    .select('*, client:clients(nom, prenom, raison_sociale, type, email), entreprise:entreprises(nom, adresse, code_postal, ville, telephone, email, tva_numero, conditions_generales_vente)')
    .eq('token_signature', token)
    .single()

  if (!devis) notFound()

  // Check if already signed
  if (devis.signature_image) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Devis d&eacute;j&agrave; sign&eacute;</h1>
          <p className="text-muted-foreground">Ce devis a d&eacute;j&agrave; &eacute;t&eacute; sign&eacute; le {new Date(devis.signature_date!).toLocaleDateString('fr-BE')}.</p>
        </div>
      </div>
    )
  }

  // Check if refused
  if (devis.statut === 'refuse') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Devis refus&eacute;</h1>
          <p className="text-muted-foreground">Ce devis a &eacute;t&eacute; refus&eacute;. Contactez HL R&eacute;novation pour plus d&apos;informations.</p>
        </div>
      </div>
    )
  }

  // Check expiration
  if (devis.token_expiration && new Date(devis.token_expiration) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Lien expir&eacute;</h1>
          <p className="text-muted-foreground">Ce lien de signature a expir&eacute;. Contactez HL R&eacute;novation pour obtenir un nouveau lien.</p>
        </div>
      </div>
    )
  }

  // Fetch lines
  const { data: lignes } = await supabase
    .from('devis_lignes')
    .select('*')
    .eq('devis_id', devis.id)
    .order('ordre')

  return <SignaturePageContent devis={devis} lignes={lignes || []} token={token} />
}
