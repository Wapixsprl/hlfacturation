'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Users, Loader2, Pencil } from 'lucide-react'
import type { Utilisateur } from '@/types/database'

const COULEURS = [
  '#17C2D7', '#E07B2A', '#16A34A', '#DC2626', '#8B5CF6',
  '#EC4899', '#F59E0B', '#6366F1', '#14B8A6', '#78716C',
]

interface EquipeMembre {
  id: string
  utilisateur: {
    id: string
    nom: string | null
    prenom: string | null
    email: string
    role: string
  }
}

export interface EquipeData {
  id: string
  nom: string
  couleur: string
  actif: boolean
  membres: EquipeMembre[]
}

interface Props {
  equipes: EquipeData[]
  utilisateurs: Utilisateur[]
}

export function EquipesTab({ equipes: initialEquipes, utilisateurs }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [equipes, setEquipes] = useState(initialEquipes)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [couleur, setCouleur] = useState(COULEURS[0])
  const [saving, setSaving] = useState(false)
  const [addMemberEquipeId, setAddMemberEquipeId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')

  const openNew = () => {
    setEditingId(null)
    setNom('')
    setCouleur(COULEURS[0])
    setDialogOpen(true)
  }

  const openEdit = (eq: EquipeData) => {
    setEditingId(eq.id)
    setNom(eq.nom)
    setCouleur(eq.couleur)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!nom.trim()) return
    setSaving(true)

    if (editingId) {
      const { error } = await supabase
        .from('equipes')
        .update({ nom: nom.trim(), couleur })
        .eq('id', editingId)

      if (error) {
        toast.error('Erreur lors de la modification')
      } else {
        toast.success('Équipe modifiée')
        setDialogOpen(false)
        router.refresh()
        setEquipes(prev => prev.map(e => e.id === editingId ? { ...e, nom: nom.trim(), couleur } : e))
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: utilisateur } = await supabase
        .from('utilisateurs')
        .select('entreprise_id')
        .eq('id', user.id)
        .single()

      if (!utilisateur) return

      const { data, error } = await supabase
        .from('equipes')
        .insert({ nom: nom.trim(), couleur, entreprise_id: utilisateur.entreprise_id })
        .select()
        .single()

      if (error) {
        toast.error('Erreur lors de la création')
      } else {
        toast.success('Équipe créée')
        setDialogOpen(false)
        setEquipes(prev => [...prev, { ...data, membres: [] }])
        router.refresh()
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('equipes').delete().eq('id', id)
    if (error) {
      toast.error('Erreur : équipe peut-être assignée à des chantiers')
    } else {
      toast.success('Équipe supprimée')
      setEquipes(prev => prev.filter(e => e.id !== id))
      router.refresh()
    }
  }

  const handleAddMember = async (equipeId: string) => {
    if (!selectedUserId) return
    const { error } = await supabase
      .from('membres_equipe')
      .insert({ equipe_id: equipeId, utilisateur_id: selectedUserId })

    if (error) {
      if (error.code === '23505') toast.error('Membre déjà dans cette équipe')
      else toast.error('Erreur lors de l\'ajout')
    } else {
      toast.success('Membre ajouté')
      setAddMemberEquipeId(null)
      setSelectedUserId('')
      router.refresh()
      // Update local state
      const user = utilisateurs.find(u => u.id === selectedUserId)
      if (user) {
        setEquipes(prev => prev.map(e => {
          if (e.id !== equipeId) return e
          return {
            ...e,
            membres: [...e.membres, {
              id: crypto.randomUUID(),
              utilisateur: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
            }],
          }
        }))
      }
    }
  }

  const handleRemoveMember = async (membreId: string, equipeId: string) => {
    const { error } = await supabase.from('membres_equipe').delete().eq('id', membreId)
    if (error) {
      toast.error('Erreur lors du retrait')
    } else {
      toast.success('Membre retiré')
      setEquipes(prev => prev.map(e => {
        if (e.id !== equipeId) return e
        return { ...e, membres: e.membres.filter(m => m.id !== membreId) }
      }))
      router.refresh()
    }
  }

  // Available users to add (not already in the equipe)
  const getAvailableUsers = (equipeId: string) => {
    const equipe = equipes.find(e => e.id === equipeId)
    const memberIds = (equipe?.membres || []).map(m => m.utilisateur.id)
    return utilisateurs.filter(u => !memberIds.includes(u.id) && u.actif)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Équipes</CardTitle>
              <CardDescription>Gérez vos équipes et leurs membres pour le planning des chantiers.</CardDescription>
            </div>
            <Button onClick={openNew} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Nouvelle équipe
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipes.length === 0 ? (
            <div className="text-center py-8 text-[#9CA3AF]">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune équipe créée</p>
              <p className="text-xs mt-1">Créez une équipe pour commencer à planifier vos chantiers</p>
            </div>
          ) : (
            equipes.map(equipe => (
              <div key={equipe.id} className="border border-[#E2E8F0] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: equipe.couleur }} />
                    <h4 className="font-semibold text-sm text-[#111827]">{equipe.nom}</h4>
                    <Badge variant="outline" className="text-[10px]">{equipe.membres.length} membre(s)</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(equipe)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(equipe.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Members list */}
                <div className="space-y-1.5 mb-3">
                  {equipe.membres.map(m => (
                    <div key={m.id} className="flex items-center justify-between py-1.5 px-3 bg-[#F9FAFB] rounded text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#17C2D7]/15 rounded-full flex items-center justify-center">
                          <span className="text-[#17C2D7] text-[9px] font-semibold">
                            {(m.utilisateur.prenom?.[0] || '').toUpperCase()}{(m.utilisateur.nom?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[#374151]">{m.utilisateur.prenom} {m.utilisateur.nom}</span>
                        <Badge variant="outline" className="text-[9px] capitalize">{m.utilisateur.role?.replace('_', ' ')}</Badge>
                      </div>
                      <button onClick={() => handleRemoveMember(m.id, equipe.id)} className="text-[#D1D5DB] hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add member */}
                {addMemberEquipeId === equipe.id ? (
                  <div className="flex gap-2">
                    <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v || '')}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Choisir un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableUsers(equipe.id).map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.prenom} {u.nom} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs" onClick={() => handleAddMember(equipe.id)}>Ajouter</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setAddMemberEquipeId(null); setSelectedUserId('') }}>Annuler</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAddMemberEquipeId(equipe.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Ajouter un membre
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier l\'équipe' : 'Nouvelle équipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Équipe Chauffage" />
            </div>
            <div>
              <Label>Couleur</Label>
              <div className="flex gap-2 mt-1.5">
                {COULEURS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCouleur(c)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: couleur === c ? '#111827' : 'transparent',
                      transform: couleur === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !nom.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {editingId ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
