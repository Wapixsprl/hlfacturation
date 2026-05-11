import { createClient } from '@/lib/supabase/server'
import { NouveauChantierContent } from '@/components/chantiers/NouveauChantierContent'

export default async function NouveauChantierPage() {
  const supabase = await createClient()

  const [{ data: clients }, { data: equipes }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, nom, prenom, raison_sociale, type')
      .is('archived_at', null)
      .order('nom'),
    supabase
      .from('equipes')
      .select('id, nom, couleur')
      .eq('actif', true)
      .order('nom'),
  ])

  return (
    <NouveauChantierContent
      clients={clients || []}
      equipes={equipes || []}
    />
  )
}
