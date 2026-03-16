'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn, formatDate, formatMontant } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  HardHat,
  ArrowLeft,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  Users,
  ClipboardList,
  Camera,
  MessageSquare,
  AlertTriangle,
  Truck,
  TrendingUp,
  CheckCircle2,
  Clock,
  Save,
  Plus,
  Trash2,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Loader2,
  Receipt,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Chantier, JournalChantier, TacheChantier, SousTraitantChantier, PvReception } from '@/types/database'

const STATUT_CONFIG = {
  a_planifier: { label: 'A planifier', className: 'bg-amber-100 text-amber-700' },
  planifie: { label: 'Planifié', className: 'bg-blue-100 text-blue-700' },
  en_cours: { label: 'En cours', className: 'bg-emerald-100 text-emerald-700' },
  termine: { label: 'Terminé', className: 'bg-slate-100 text-slate-600' },
  livre: { label: 'Livré', className: 'bg-purple-100 text-purple-700' },
}

const PRIORITE_CONFIG = {
  basse: { label: 'Basse', className: 'bg-slate-100 text-slate-500' },
  normale: { label: 'Normale', className: 'bg-slate-100 text-slate-600' },
  haute: { label: 'Haute', className: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700' },
}

const TABS = [
  { id: 'resume', label: 'Résumé', icon: ClipboardList },
  { id: 'journal', label: 'Journal', icon: MessageSquare },
  { id: 'taches', label: 'Tâches', icon: CheckCircle2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'photos', label: 'Photos', icon: Camera },
] as const

type TabId = typeof TABS[number]['id']

interface Props {
  chantier: Chantier & {
    client?: { id: string; nom: string | null; prenom: string | null; raison_sociale: string | null; type: string; email: string | null; telephone: string | null; adresse: string | null; code_postal: string | null; ville: string | null }
    equipe?: { id: string; nom: string; couleur: string } | null
    devis?: { id: string; numero: string; total_ht: number; total_ttc: number; statut: string } | null
  }
  journal: (JournalChantier & { auteur?: { id: string; nom: string | null; prenom: string | null } })[]
  taches: (TacheChantier & { equipe?: { id: string; nom: string; couleur: string } | null })[]
  sousTraitants: (SousTraitantChantier & { fournisseur?: { id: string; raison_sociale: string } })[]
  pvReception: PvReception[]
  equipes: { id: string; nom: string; couleur: string }[]
  fournisseurs: { id: string; raison_sociale: string }[]
  factures: { id: string; numero: string; total_ttc: number; statut: string; date_facture: string }[]
  facturesAchat: { id: string; numero_fournisseur: string | null; total_ttc: number; statut: string; date_facture: string; fournisseur?: { raison_sociale: string } | null }[]
}

function getClientName(client?: Props['chantier']['client']) {
  if (!client) return '—'
  if (client.type === 'professionnel' && client.raison_sociale) return client.raison_sociale
  return [client.prenom, client.nom].filter(Boolean).join(' ') || '—'
}

const METEO_ICONS = {
  ensoleille: { icon: Sun, label: 'Ensoleillé', className: 'text-yellow-500' },
  nuageux: { icon: Cloud, label: 'Nuageux', className: 'text-slate-400' },
  pluie: { icon: CloudRain, label: 'Pluie', className: 'text-blue-500' },
  neige: { icon: Snowflake, label: 'Neige', className: 'text-cyan-400' },
}

const JOURNAL_TYPE_CONFIG = {
  commentaire: { label: 'Commentaire', icon: MessageSquare, className: 'text-blue-600 bg-blue-50' },
  photo: { label: 'Photo', icon: Camera, className: 'text-emerald-600 bg-emerald-50' },
  incident: { label: 'Incident', icon: AlertTriangle, className: 'text-red-600 bg-red-50' },
  livraison_materiel: { label: 'Livraison', icon: Truck, className: 'text-amber-600 bg-amber-50' },
  avancement: { label: 'Avancement', icon: TrendingUp, className: 'text-purple-600 bg-purple-50' },
  reception: { label: 'Réception', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50' },
}

export function ChantierDetailContent({
  chantier,
  journal,
  taches,
  sousTraitants,
  pvReception,
  equipes,
  fournisseurs,
  factures,
  facturesAchat,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabId>('resume')
  const [saving, setSaving] = useState(false)

  // Editable chantier fields
  const [statut, setStatut] = useState(chantier.statut)
  const [priorite, setPriorite] = useState(chantier.priorite)
  const [equipeId, setEquipeId] = useState(chantier.equipe_id || '')
  const [dateDebut, setDateDebut] = useState(chantier.date_debut || '')
  const [dateFinPrevue, setDateFinPrevue] = useState(chantier.date_fin_prevue || '')
  const [notesInternes, setNotesInternes] = useState(chantier.notes_internes || '')

  // Journal form
  const [journalType, setJournalType] = useState<string>('commentaire')
  const [journalContenu, setJournalContenu] = useState('')
  const [journalMeteo, setJournalMeteo] = useState<string>('')
  const [journalAvancement, setJournalAvancement] = useState<string>('')
  const [addingJournal, setAddingJournal] = useState(false)

  // Tache form
  const [newTacheTitre, setNewTacheTitre] = useState('')
  const [addingTache, setAddingTache] = useState(false)

  const handleSaveChantier = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('chantiers')
      .update({
        statut,
        priorite,
        equipe_id: equipeId || null,
        date_debut: dateDebut || null,
        date_fin_prevue: dateFinPrevue || null,
        notes_internes: notesInternes || null,
      })
      .eq('id', chantier.id)

    setSaving(false)
    if (error) {
      toast.error('Erreur lors de la sauvegarde')
    } else {
      toast.success('Chantier mis à jour')
      router.refresh()
    }
  }

  const handleAddJournal = async () => {
    if (!journalContenu.trim() && journalType !== 'avancement') return
    setAddingJournal(true)

    const { error } = await supabase.from('journal_chantier').insert({
      chantier_id: chantier.id,
      auteur_id: (await supabase.auth.getUser()).data.user?.id,
      type: journalType,
      contenu: journalContenu.trim() || null,
      meteo: journalMeteo || null,
      avancement_pct: journalAvancement ? parseInt(journalAvancement) : null,
    })

    setAddingJournal(false)
    if (error) {
      toast.error('Erreur lors de l\'ajout')
    } else {
      toast.success('Entrée ajoutée au journal')
      setJournalContenu('')
      setJournalMeteo('')
      setJournalAvancement('')
      router.refresh()
    }
  }

  const handleAddTache = async () => {
    if (!newTacheTitre.trim()) return
    setAddingTache(true)

    const { error } = await supabase.from('taches_chantier').insert({
      chantier_id: chantier.id,
      titre: newTacheTitre.trim(),
      ordre: taches.length,
    })

    setAddingTache(false)
    if (error) {
      toast.error('Erreur lors de l\'ajout')
    } else {
      toast.success('Tâche ajoutée')
      setNewTacheTitre('')
      router.refresh()
    }
  }

  const handleToggleTache = async (tacheId: string, currentStatut: string) => {
    const newStatut = currentStatut === 'termine' ? 'a_faire' : 'termine'
    await supabase.from('taches_chantier').update({ statut: newStatut }).eq('id', tacheId)
    router.refresh()
  }

  const handleDeleteTache = async (tacheId: string) => {
    await supabase.from('taches_chantier').delete().eq('id', tacheId)
    router.refresh()
  }

  const completedTaches = taches.filter(t => t.statut === 'termine').length
  const totalTaches = taches.length
  const avancementGlobal = totalTaches > 0 ? Math.round((completedTaches / totalTaches) * 100) : 0

  // Collect all photos from journal entries
  const allPhotos = journal
    .filter(j => j.photos && Array.isArray(j.photos) && j.photos.length > 0)
    .flatMap(j => (j.photos as string[]).map(url => ({ url, date: j.date_entree, auteur: j.auteur })))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/chantiers">
            <Button variant="ghost" size="icon" className="rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-[#6B7280]" />
              <h1 className="text-xl font-bold text-[#111827]">{chantier.numero}</h1>
              <Badge className={STATUT_CONFIG[statut].className}>{STATUT_CONFIG[statut].label}</Badge>
              {priorite !== 'normale' && (
                <Badge className={PRIORITE_CONFIG[priorite].className}>{PRIORITE_CONFIG[priorite].label}</Badge>
              )}
            </div>
            <p className="text-sm text-[#6B7280] mt-0.5">{chantier.titre}</p>
          </div>
        </div>
        <Button onClick={handleSaveChantier} disabled={saving} className="bg-[#1E2028] hover:bg-[#2a2d35]">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#E2E8F0] overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-[#17C2D7] text-[#17C2D7]'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.id === 'journal' && journal.length > 0 && (
              <span className="text-xs bg-[#F3F4F6] text-[#6B7280] px-1.5 rounded-full">{journal.length}</span>
            )}
            {tab.id === 'taches' && totalTaches > 0 && (
              <span className="text-xs bg-[#F3F4F6] text-[#6B7280] px-1.5 rounded-full">{completedTaches}/{totalTaches}</span>
            )}
            {tab.id === 'photos' && allPhotos.length > 0 && (
              <span className="text-xs bg-[#F3F4F6] text-[#6B7280] px-1.5 rounded-full">{allPhotos.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Infos principales */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-[#111827] text-sm">Informations du chantier</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1 block">Statut</label>
                    <Select value={statut} onValueChange={(v) => setStatut(v as Chantier['statut'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1 block">Priorité</label>
                    <Select value={priorite} onValueChange={(v) => setPriorite(v as Chantier['priorite'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITE_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-[#6B7280] mb-1 block">Équipe</label>
                    <Select value={equipeId} onValueChange={(v) => setEquipeId(v || '')}>
                      <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Non assigné</SelectItem>
                        {equipes.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.couleur }} />
                              {e.nom}
                            </span>
                          </SelectItem>
                        ))}
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
                </div>
                <div>
                  <label className="text-xs text-[#6B7280] mb-1 block">Notes internes</label>
                  <Textarea
                    value={notesInternes}
                    onChange={e => setNotesInternes(e.target.value)}
                    placeholder="Notes internes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Budget */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-4">Budget & Coûts</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-[#F9FAFB] rounded-lg">
                    <p className="text-xs text-[#6B7280]">Budget (devis)</p>
                    <p className="text-lg font-bold text-[#111827]">{formatMontant(chantier.budget_ht)}</p>
                    <p className="text-[10px] text-[#9CA3AF]">HT</p>
                  </div>
                  <div className="text-center p-3 bg-[#F9FAFB] rounded-lg">
                    <p className="text-xs text-[#6B7280]">Coût réel</p>
                    <p className="text-lg font-bold text-[#111827]">{formatMontant(chantier.cout_reel_ht)}</p>
                    <p className="text-[10px] text-[#9CA3AF]">HT</p>
                  </div>
                  <div className="text-center p-3 bg-[#F9FAFB] rounded-lg">
                    <p className="text-xs text-[#6B7280]">Marge</p>
                    <p className={cn(
                      "text-lg font-bold",
                      chantier.budget_ht - chantier.cout_reel_ht >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {formatMontant(chantier.budget_ht - chantier.cout_reel_ht)}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">HT</p>
                  </div>
                </div>
                {totalTaches > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                      <span>Avancement</span>
                      <span>{avancementGlobal}%</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-2">
                      <div
                        className="bg-[#17C2D7] h-2 rounded-full transition-all"
                        style={{ width: `${avancementGlobal}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sous-traitants */}
            {sousTraitants.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[#111827] text-sm mb-3">Sous-traitants</h3>
                  <div className="space-y-2">
                    {sousTraitants.map(st => (
                      <div key={st.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-[#111827]">{st.fournisseur?.raison_sociale}</p>
                          {st.role && <p className="text-xs text-[#6B7280]">{st.role}</p>}
                        </div>
                        <p className="text-sm font-semibold text-[#111827]">{formatMontant(st.montant_prevu_ht)} HT</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Client */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-3">Client</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-sm text-[#374151]">{getClientName(chantier.client)}</span>
                  </div>
                  {chantier.client?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#6B7280]" />
                      <a href={`mailto:${chantier.client.email}`} className="text-sm text-[#17C2D7] hover:underline">{chantier.client.email}</a>
                    </div>
                  )}
                  {chantier.client?.telephone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#6B7280]" />
                      <a href={`tel:${chantier.client.telephone}`} className="text-sm text-[#374151]">{chantier.client.telephone}</a>
                    </div>
                  )}
                  {(chantier.adresse || chantier.ville) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-[#6B7280] mt-0.5" />
                      <span className="text-sm text-[#374151]">
                        {[chantier.adresse, chantier.code_postal, chantier.ville].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Devis lié */}
            {chantier.devis && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[#111827] text-sm mb-3">Devis lié</h3>
                  <Link href={`/devis/${chantier.devis.id}`} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{chantier.devis.numero}</p>
                      <p className="text-xs text-[#6B7280]">{formatMontant(chantier.devis.total_ttc)} TTC</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Equipe */}
            {chantier.equipe && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-[#111827] text-sm mb-3">Équipe</h3>
                  <div className="flex items-center gap-2 p-3 bg-[#F9FAFB] rounded-lg">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: chantier.equipe.couleur }} />
                    <span className="text-sm font-medium text-[#111827]">{chantier.equipe.nom}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dates */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-3">Dates</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Créé le</span>
                    <span className="text-[#374151]">{formatDate(chantier.created_at)}</span>
                  </div>
                  {chantier.date_debut && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Début</span>
                      <span className="text-[#374151]">{formatDate(chantier.date_debut)}</span>
                    </div>
                  )}
                  {chantier.date_fin_prevue && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Fin prévue</span>
                      <span className="text-[#374151]">{formatDate(chantier.date_fin_prevue)}</span>
                    </div>
                  )}
                  {chantier.date_fin_reelle && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Fin réelle</span>
                      <span className="text-[#374151]">{formatDate(chantier.date_fin_reelle)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="space-y-6">
          {/* Add entry form */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-[#111827] text-sm mb-4">Ajouter une entrée</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Select value={journalType} onValueChange={(v) => setJournalType(v || 'commentaire')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(JOURNAL_TYPE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={journalMeteo} onValueChange={(v) => setJournalMeteo(v || '')}>
                    <SelectTrigger><SelectValue placeholder="Météo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {Object.entries(METEO_ICONS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {journalType === 'avancement' && (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Avancement %"
                      value={journalAvancement}
                      onChange={e => setJournalAvancement(e.target.value)}
                    />
                  )}
                </div>
                <Textarea
                  value={journalContenu}
                  onChange={e => setJournalContenu(e.target.value)}
                  placeholder="Commentaire, observation, incident..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button onClick={handleAddJournal} disabled={addingJournal} size="sm">
                    {addingJournal ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                    Ajouter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          {journal.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune entrée dans le journal</p>
            </div>
          ) : (
            <div className="space-y-3">
              {journal.map(entry => {
                const typeConfig = JOURNAL_TYPE_CONFIG[entry.type]
                const TypeIcon = typeConfig.icon
                return (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", typeConfig.className)}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[#111827]">
                              {entry.auteur ? `${entry.auteur.prenom || ''} ${entry.auteur.nom || ''}`.trim() : 'Inconnu'}
                            </span>
                            <Badge variant="outline" className="text-[10px]">{typeConfig.label}</Badge>
                            <span className="text-xs text-[#9CA3AF]">{formatDate(entry.date_entree)}</span>
                            {entry.meteo && METEO_ICONS[entry.meteo] && (
                              <span title={METEO_ICONS[entry.meteo].label}>
                                {(() => {
                                  const MeteoIcon = METEO_ICONS[entry.meteo!].icon
                                  return <MeteoIcon className={cn("h-4 w-4", METEO_ICONS[entry.meteo!].className)} />
                                })()}
                              </span>
                            )}
                          </div>
                          {entry.contenu && (
                            <p className="text-sm text-[#374151] mt-1 whitespace-pre-wrap">{entry.contenu}</p>
                          )}
                          {entry.avancement_pct !== null && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                                <span>Avancement</span>
                                <span>{entry.avancement_pct}%</span>
                              </div>
                              <div className="w-full bg-[#E5E7EB] rounded-full h-1.5">
                                <div className="bg-[#17C2D7] h-1.5 rounded-full" style={{ width: `${entry.avancement_pct}%` }} />
                              </div>
                            </div>
                          )}
                          {entry.photos && Array.isArray(entry.photos) && entry.photos.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {(entry.photos as string[]).map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden bg-[#F3F4F6]">
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'taches' && (
        <div className="space-y-6">
          {/* Add task */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input
                  value={newTacheTitre}
                  onChange={e => setNewTacheTitre(e.target.value)}
                  placeholder="Nouvelle tâche..."
                  onKeyDown={e => e.key === 'Enter' && handleAddTache()}
                />
                <Button onClick={handleAddTache} disabled={addingTache} size="sm">
                  {addingTache ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {totalTaches > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-[#E5E7EB] rounded-full h-2.5">
                  <div className="bg-[#17C2D7] h-2.5 rounded-full transition-all" style={{ width: `${avancementGlobal}%` }} />
                </div>
              </div>
              <span className="text-sm font-medium text-[#374151]">{completedTaches}/{totalTaches} terminées</span>
            </div>
          )}

          {/* Task list */}
          {taches.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune tâche</p>
            </div>
          ) : (
            <div className="space-y-2">
              {taches.map(tache => (
                <Card key={tache.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTache(tache.id, tache.statut)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0",
                        tache.statut === 'termine'
                          ? 'bg-[#17C2D7] border-[#17C2D7]'
                          : 'border-[#D1D5DB] hover:border-[#17C2D7]'
                      )}
                    >
                      {tache.statut === 'termine' && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </button>
                    <span className={cn(
                      "flex-1 text-sm",
                      tache.statut === 'termine' ? 'line-through text-[#9CA3AF]' : 'text-[#374151]'
                    )}>
                      {tache.titre}
                    </span>
                    {tache.equipe && (
                      <Badge variant="outline" className="text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: tache.equipe.couleur }} />
                        {tache.equipe.nom}
                      </Badge>
                    )}
                    {tache.date_fin && (
                      <span className="text-xs text-[#9CA3AF]">{formatDate(tache.date_fin)}</span>
                    )}
                    <button onClick={() => handleDeleteTache(tache.id)} className="text-[#D1D5DB] hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Devis */}
          {chantier.devis && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Devis
                </h3>
                <Link href={`/devis/${chantier.devis.id}`} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{chantier.devis.numero}</p>
                    <p className="text-xs text-[#6B7280]">{formatMontant(chantier.devis.total_ttc)} TTC</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Factures */}
          {factures.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Factures client
                </h3>
                <div className="space-y-2">
                  {factures.map(f => (
                    <Link key={f.id} href={`/factures/${f.id}`} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{f.numero}</p>
                        <p className="text-xs text-[#6B7280]">{formatDate(f.date_facture)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#111827]">{formatMontant(f.total_ttc)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Factures achat */}
          {facturesAchat.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Factures fournisseurs
                </h3>
                <div className="space-y-2">
                  {facturesAchat.map(fa => (
                    <Link key={fa.id} href={`/factures-achat/${fa.id}`} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{fa.fournisseur?.raison_sociale} — {fa.numero_fournisseur || 'N/A'}</p>
                        <p className="text-xs text-[#6B7280]">{formatDate(fa.date_facture)}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#111827]">{formatMontant(fa.total_ttc)}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PV Reception */}
          {pvReception.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-[#111827] text-sm mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> PV de réception
                </h3>
                <div className="space-y-2">
                  {pvReception.map(pv => (
                    <div key={pv.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-[#111827]">Réception du {formatDate(pv.date_reception)}</p>
                        <p className="text-xs text-[#6B7280]">
                          {pv.signature_client ? 'Signé' : 'En attente de signature'}
                          {pv.reserves && Array.isArray(pv.reserves) && ` — ${(pv.reserves as { texte: string; resolu: boolean }[]).length} réserve(s)`}
                        </p>
                      </div>
                      {pv.signature_client && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!chantier.devis && factures.length === 0 && facturesAchat.length === 0 && pvReception.length === 0 && (
            <div className="text-center py-12 text-[#9CA3AF]">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun document lié</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'photos' && (
        <div>
          {allPhotos.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune photo</p>
              <p className="text-xs mt-1">Les photos ajoutées au journal apparaîtront ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allPhotos.map((photo, i) => (
                <a
                  key={i}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden bg-[#F3F4F6] group relative"
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-[10px] text-white">{formatDate(photo.date)}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
