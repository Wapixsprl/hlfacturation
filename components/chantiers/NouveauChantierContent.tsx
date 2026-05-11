'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, HardHat, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { Client, Equipe } from '@/types/database'

interface Props {
  clients: Pick<Client, 'id' | 'nom' | 'prenom' | 'raison_sociale' | 'type'>[]
  equipes: Pick<Equipe, 'id' | 'nom' | 'couleur'>[]
}

function getClientLabel(c: Props['clients'][number]) {
  if (c.type === 'professionnel' && c.raison_sociale) return c.raison_sociale
  return [c.prenom, c.nom].filter(Boolean).join(' ') || '—'
}

export function NouveauChantierContent({ clients, equipes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { utilisateur } = useUser()

  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState('')
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville, setVille] = useState('')
  const [statut, setStatut] = useState<'a_planifier' | 'planifie' | 'en_cours' | 'termine' | 'livre'>('a_planifier')
  const [priorite, setPriorite] = useState<'basse' | 'normale' | 'haute' | 'urgente'>('normale')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFinPrevue, setDateFinPrevue] = useState('')
  const [equipeId, setEquipeId] = useState('')
  const [notesInternes, setNotesInternes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) { toast.error('Veuillez sélectionner un client'); return }
    if (!titre.trim()) { toast.error('Le titre est obligatoire'); return }
    if (!utilisateur) { toast.error('Utilisateur non trouvé'); return }

    setSaving(true)
    try {
      const { data: numResult, error: numError } = await supabase.rpc('generate_numero', {
        p_type: 'CHT',
        p_entreprise_id: utilisateur.entreprise_id,
      })
      if (numError) throw numError

      const { data: chantier, error } = await supabase
        .from('chantiers')
        .insert({
          entreprise_id: utilisateur.entreprise_id,
          client_id: clientId,
          numero: numResult as string,
          titre: titre.trim(),
          description: description.trim() || null,
          adresse: adresse.trim() || null,
          code_postal: codePostal.trim() || null,
          ville: ville.trim() || null,
          statut,
          priorite,
          date_debut: dateDebut || null,
          date_fin_prevue: dateFinPrevue || null,
          equipe_id: equipeId || null,
          notes_internes: notesInternes.trim() || null,
        })
        .select('id')
        .single()

      if (error) throw error

      toast.success('Chantier créé')
      router.push(`/chantiers/${chantier.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la création du chantier')
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/chantiers">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-[#6B7280]" />
          <h1 className="text-xl font-bold text-[#111827]">Nouveau chantier</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Infos principales */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-[#111827] text-sm">Informations générales</h3>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Client <span className="text-red-500">*</span></label>
                  <Select value={clientId} onValueChange={v => setClientId(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{getClientLabel(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Titre du chantier <span className="text-red-500">*</span></label>
                  <Input
                    value={titre}
                    onChange={e => setTitre(e.target.value)}
                    placeholder="Ex: Rénovation salle de bain — Dupont"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Description</label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description des travaux..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Adresse chantier */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-[#111827] text-sm">Adresse du chantier</h3>
                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Adresse</label>
                  <Input
                    value={adresse}
                    onChange={e => setAdresse(e.target.value)}
                    placeholder="Rue, numéro..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1 block">Code postal</label>
                    <Input
                      value={codePostal}
                      onChange={e => setCodePostal(e.target.value)}
                      placeholder="7500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1 block">Ville</label>
                    <Input
                      value={ville}
                      onChange={e => setVille(e.target.value)}
                      placeholder="Tournai"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-3">Notes internes</h3>
                <Textarea
                  value={notesInternes}
                  onChange={e => setNotesInternes(e.target.value)}
                  placeholder="Notes internes (non visibles par le client)..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-[#111827] text-sm">Planification</h3>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Statut</label>
                  <Select value={statut} onValueChange={v => setStatut((v ?? 'a_planifier') as typeof statut)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_planifier">A planifier</SelectItem>
                      <SelectItem value="planifie">Planifié</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="termine">Terminé</SelectItem>
                      <SelectItem value="livre">Livré</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Priorité</label>
                  <Select value={priorite} onValueChange={v => setPriorite((v ?? 'normale') as typeof priorite)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basse">Basse</SelectItem>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="haute">Haute</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Date de début</label>
                  <Input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Date de fin prévue</label>
                  <Input type="date" value={dateFinPrevue} onChange={e => setDateFinPrevue(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Équipe</label>
                  <Select value={equipeId} onValueChange={v => setEquipeId(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Non assigné" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Non assigné</SelectItem>
                      {equipes.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: e.couleur }} />
                            {e.nom}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1E2028] hover:bg-[#2a2d35] text-white"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création...</>
                : <><Save className="h-4 w-4 mr-2" />Créer le chantier</>
              }
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
