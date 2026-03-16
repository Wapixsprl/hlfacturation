import { createClient } from '@/lib/supabase/server'
import { ChantiersPageContent } from '@/components/chantiers/ChantiersPageContent'

export default async function ChantiersPage() {
  const supabase = await createClient()
  const { data: chantiers } = await supabase
    .from('chantiers')
    .select('*, client:clients(id, nom, prenom, raison_sociale, type), equipe:equipes(id, nom, couleur), devis:devis(id, numero, total_ht)')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  const { data: equipes } = await supabase
    .from('equipes')
    .select('id, nom, couleur')
    .eq('actif', true)
    .order('nom')

  return <ChantiersPageContent initialChantiers={chantiers || []} equipes={equipes || []} />
}
