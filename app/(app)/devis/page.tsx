import { createClient } from '@/lib/supabase/server'
import { DevisPageContent } from '@/components/devis/DevisPageContent'

export default async function DevisPage() {
  const supabase = await createClient()
  const { data: devis } = await supabase
    .from('devis')
    .select('*, client:clients(id, nom, prenom, raison_sociale, type)')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  return <DevisPageContent initialDevis={devis || []} />
}
