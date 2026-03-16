import { createClient } from '@/lib/supabase/server'
import { PlanningPageContent } from '@/components/planning/PlanningPageContent'

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: chantiers } = await supabase
    .from('chantiers')
    .select('*, client:clients(id, nom, prenom, raison_sociale, type), equipe:equipes(id, nom, couleur)')
    .is('archived_at', null)
    .in('statut', ['planifie', 'en_cours'])
    .order('date_debut', { ascending: true })

  const { data: equipes } = await supabase
    .from('equipes')
    .select('id, nom, couleur')
    .eq('actif', true)
    .order('nom')

  return <PlanningPageContent initialChantiers={chantiers || []} equipes={equipes || []} />
}
