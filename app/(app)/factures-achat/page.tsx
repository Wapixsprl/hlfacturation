import { createClient } from '@/lib/supabase/server'
import { FacturesAchatPageContent } from '@/components/factures-achat/FacturesAchatPageContent'

export default async function FacturesAchatPage() {
  const supabase = await createClient()
  const { data: facturesAchat } = await supabase
    .from('factures_achat')
    .select('*, fournisseur:fournisseurs(raison_sociale, contact_nom)')
    .is('archived_at', null)
    .order('date_facture', { ascending: false })

  return <FacturesAchatPageContent initialFactures={facturesAchat || []} />
}
