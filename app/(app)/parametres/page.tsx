import { createClient } from '@/lib/supabase/server'
import { ParametresPageContent } from '@/components/parametres/ParametresPageContent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'

export default async function ParametresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Vous devez être connecté pour accéder à cette page.
        </CardContent>
      </Card>
    )
  }

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!utilisateur) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Utilisateur non trouvé.
        </CardContent>
      </Card>
    )
  }

  // Access control: only super_admin
  if (utilisateur.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-500">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            Vous n&apos;avez pas les permissions nécessaires pour accéder aux paramètres.
            Seuls les administrateurs peuvent modifier ces réglages.
          </CardContent>
        </Card>
      </div>
    )
  }

  // Parallelize all remaining queries
  const [{ data: entreprise }, { data: utilisateurs }, { data: objectifs }, { data: equipes }] = await Promise.all([
    supabase
      .from('entreprises')
      .select('*')
      .eq('id', utilisateur.entreprise_id)
      .single(),
    supabase
      .from('utilisateurs')
      .select('*')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .order('created_at', { ascending: true }),
    supabase
      .from('objectifs_ca')
      .select('*')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .order('annee', { ascending: false }),
    supabase
      .from('equipes')
      .select('*, membres:membres_equipe(id, utilisateur:utilisateurs(id, nom, prenom, email, role))')
      .eq('entreprise_id', utilisateur.entreprise_id)
      .order('nom'),
  ])

  if (!entreprise) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Entreprise non trouvée.
        </CardContent>
      </Card>
    )
  }

  return (
    <ParametresPageContent
      entreprise={entreprise}
      utilisateur={utilisateur}
      utilisateurs={utilisateurs || []}
      objectifs={objectifs || []}
      equipes={(equipes || []) as never[]}
    />
  )
}
