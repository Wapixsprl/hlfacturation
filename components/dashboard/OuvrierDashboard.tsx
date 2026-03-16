'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  HardHat,
  MapPin,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Camera,
  MessageSquare,
  AlertTriangle,
  Truck,
  TrendingUp,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export interface ChantierItem {
  id: string
  numero: string
  titre: string
  adresse: string | null
  ville: string | null
  statut: string
  equipe?: { id: string; nom: string; couleur: string } | null
  client?: { nom: string | null; prenom: string | null; raison_sociale: string | null; type: string } | null
  [key: string]: unknown
}

export interface JournalEntry {
  id: string
  type: string
  contenu: string | null
  date_entree: string
  photos: string[]
  avancement_pourcentage: number | null
  meteo: string | null
  created_at: string
  chantier?: { numero: string; titre: string } | null
  [key: string]: unknown
}

interface Props {
  chantiers: ChantierItem[]
  recentEntries: JournalEntry[]
  utilisateur: { prenom: string | null; nom: string | null; id: string }
}

const TYPES_ENTREE = [
  { value: 'commentaire', label: 'Commentaire', icon: MessageSquare },
  { value: 'photo', label: 'Photo', icon: Camera },
  { value: 'incident', label: 'Incident', icon: AlertTriangle },
  { value: 'livraison_materiel', label: 'Livraison', icon: Truck },
  { value: 'avancement', label: 'Avancement', icon: TrendingUp },
] as const

const METEO_OPTIONS = [
  { value: 'ensoleille', label: 'Ensoleille', icon: Sun },
  { value: 'nuageux', label: 'Nuageux', icon: Cloud },
  { value: 'pluie', label: 'Pluie', icon: CloudRain },
  { value: 'neige', label: 'Neige', icon: Snowflake },
] as const

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  planifie: { label: 'Planifie', color: 'bg-blue-100 text-blue-700' },
  en_cours: { label: 'En cours', color: 'bg-amber-100 text-amber-700' },
}

function getClientName(client: ChantierItem['client']): string {
  if (!client) return 'Client'
  if (client.type === 'professionnel' && client.raison_sociale) {
    return client.raison_sociale
  }
  return [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'
}

function getTypeConfig(type: string) {
  return TYPES_ENTREE.find(t => t.value === type) || TYPES_ENTREE[0]
}

export function OuvrierDashboard({ chantiers, recentEntries, utilisateur }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [expandedChantier, setExpandedChantier] = useState<string | null>(null)
  const [typeEntree, setTypeEntree] = useState('commentaire')
  const [meteo, setMeteo] = useState<string | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [avancement, setAvancement] = useState(50)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const todayFormatted = format(new Date(), "EEEE d MMMM yyyy", { locale: fr })
  const prenom = utilisateur.prenom || 'Ouvrier'

  function resetForm() {
    setTypeEntree('commentaire')
    setMeteo(null)
    setCommentaire('')
    setAvancement(50)
    setPhotos([])
  }

  function toggleChantier(chantierId: string) {
    if (expandedChantier === chantierId) {
      setExpandedChantier(null)
      resetForm()
    } else {
      setExpandedChantier(chantierId)
      resetForm()
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecte')

      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

        const { error } = await supabase.storage
          .from('chantiers')
          .upload(fileName, file, { contentType: file.type })

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from('chantiers')
          .getPublicUrl(fileName)

        uploadedUrls.push(urlData.publicUrl)
      }

      setPhotos(prev => [...prev, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} photo(s) ajoutee(s)`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(chantierId: string) {
    if (!commentaire.trim() && typeEntree !== 'photo' && typeEntree !== 'avancement') {
      toast.error('Veuillez ajouter un commentaire')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecte')

      const entry: Record<string, unknown> = {
        chantier_id: chantierId,
        auteur_id: user.id,
        type: typeEntree,
        contenu: commentaire.trim() || null,
        meteo: meteo,
        photos: photos.length > 0 ? photos : null,
      }

      if (typeEntree === 'avancement') {
        entry.avancement_pourcentage = avancement
      }

      const { error } = await supabase
        .from('journal_chantier')
        .insert(entry)

      if (error) throw error

      toast.success('Entree ajoutee au journal')
      setExpandedChantier(null)
      resetForm()
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <HardHat className="h-6 w-6 text-[#17C2D7]" />
          <h1 className="text-xl font-bold text-[#111827]">
            Bonjour {prenom}
          </h1>
        </div>
        <p className="text-sm text-[#6B7280] capitalize flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {todayFormatted}
        </p>
      </div>

      {/* Mes chantiers */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
          Mes chantiers
        </h2>

        {chantiers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-[#6B7280]">
              <HardHat className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Aucun chantier assigne pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chantiers.map((chantier) => {
              const isExpanded = expandedChantier === chantier.id
              const statutConfig = STATUT_LABELS[chantier.statut] || { label: chantier.statut, color: 'bg-gray-100 text-gray-700' }

              return (
                <Card key={chantier.id} className={cn(
                  'transition-shadow duration-150',
                  isExpanded && 'ring-2 ring-[#17C2D7]/30'
                )}>
                  <CardContent className="p-4">
                    {/* Chantier info */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-[#6B7280]">{chantier.numero}</span>
                          <Badge className={cn('text-xs', statutConfig.color)}>
                            {statutConfig.label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-[#111827] truncate">
                          {chantier.titre || 'Sans titre'}
                        </h3>
                      </div>
                      {chantier.equipe && (
                        <Badge
                          className="text-xs ml-2 shrink-0"
                          style={{
                            backgroundColor: chantier.equipe.couleur ? `${chantier.equipe.couleur}20` : undefined,
                            color: chantier.equipe.couleur || undefined,
                            borderColor: chantier.equipe.couleur || undefined,
                          }}
                          variant="outline"
                        >
                          {chantier.equipe.nom}
                        </Badge>
                      )}
                    </div>

                    {/* Client + adresse */}
                    <p className="text-sm text-[#6B7280] mb-1">
                      {getClientName(chantier.client)}
                    </p>
                    {(chantier.adresse || chantier.ville) && (
                      <p className="text-xs text-[#9CA3AF] flex items-center gap-1 mb-3">
                        <MapPin className="h-3 w-3" />
                        {[chantier.adresse, chantier.ville].filter(Boolean).join(', ')}
                      </p>
                    )}

                    {/* Toggle button */}
                    <Button
                      variant={isExpanded ? 'secondary' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => toggleChantier(chantier.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1.5" />
                          Fermer
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1.5" />
                          Journal du jour
                        </>
                      )}
                    </Button>

                    {/* Journal form */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#E5E7EB] space-y-4">
                        {/* Type selector */}
                        <div>
                          <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Type</label>
                          <div className="flex flex-wrap gap-1.5">
                            {TYPES_ENTREE.map((t) => {
                              const Icon = t.icon
                              const isSelected = typeEntree === t.value
                              return (
                                <button
                                  key={t.value}
                                  type="button"
                                  onClick={() => setTypeEntree(t.value)}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                                    isSelected
                                      ? 'bg-[#17C2D7] text-white'
                                      : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {t.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Meteo selector */}
                        <div>
                          <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Meteo</label>
                          <div className="flex gap-2">
                            {METEO_OPTIONS.map((m) => {
                              const Icon = m.icon
                              const isSelected = meteo === m.value
                              return (
                                <button
                                  key={m.value}
                                  type="button"
                                  onClick={() => setMeteo(isSelected ? null : m.value)}
                                  className={cn(
                                    'flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors duration-150 min-w-[60px]',
                                    isSelected
                                      ? 'border-[#17C2D7] bg-[#17C2D7]/10 text-[#17C2D7]'
                                      : 'border-[#E5E7EB] text-[#9CA3AF] hover:border-[#D1D5DB]'
                                  )}
                                  title={m.label}
                                >
                                  <Icon className="h-5 w-5" />
                                  <span className="text-[10px]">{m.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Avancement slider */}
                        {typeEntree === 'avancement' && (
                          <div>
                            <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">
                              Avancement : {avancement}%
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={5}
                              value={avancement}
                              onChange={(e) => setAvancement(Number(e.target.value))}
                              className="w-full accent-[#17C2D7]"
                            />
                            <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                              <span>0%</span>
                              <span>50%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        )}

                        {/* Commentaire */}
                        <div>
                          <label className="text-xs font-medium text-[#6B7280] mb-1.5 block">Commentaire</label>
                          <Textarea
                            placeholder="Decrivez l'avancement, un incident, une remarque..."
                            value={commentaire}
                            onChange={(e) => setCommentaire(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                        </div>

                        {/* Photo upload */}
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            {uploading ? (
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4 mr-1.5" />
                            )}
                            {uploading ? 'Upload...' : 'Ajouter des photos'}
                          </Button>

                          {/* Photo previews */}
                          {photos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {photos.map((url, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-[#E5E7EB]">
                                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute top-0 right-0 bg-black/50 text-white text-xs w-4 h-4 flex items-center justify-center rounded-bl"
                                  >
                                    x
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Submit */}
                        <Button
                          className="w-full bg-[#17C2D7] hover:bg-[#14a8bb] text-white"
                          onClick={() => handleSubmit(chantier.id)}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : null}
                          {submitting ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Mes dernieres entrees */}
      <div>
        <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">
          Mes dernieres entrees
        </h2>

        {recentEntries.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-[#6B7280]">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune entree pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => {
              const typeConfig = getTypeConfig(entry.type)
              const Icon = typeConfig.icon
              const entryPhotos: string[] = entry.photos || []

              return (
                <Card key={entry.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 rounded-md bg-[#F3F4F6] shrink-0">
                        <Icon className="h-4 w-4 text-[#6B7280]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {typeConfig.label}
                          </Badge>
                          {entry.chantier && (
                            <span className="text-[10px] font-mono text-[#9CA3AF]">
                              {entry.chantier.numero}
                            </span>
                          )}
                        </div>
                        {entry.contenu && (
                          <p className="text-sm text-[#374151] line-clamp-2">
                            {entry.contenu}
                          </p>
                        )}
                        {entry.type === 'avancement' && entry.avancement_pourcentage != null && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#17C2D7] rounded-full transition-all"
                                style={{ width: `${entry.avancement_pourcentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[#6B7280]">
                              {entry.avancement_pourcentage}%
                            </span>
                          </div>
                        )}
                        {/* Photo thumbnails */}
                        {entryPhotos.length > 0 && (
                          <div className="flex gap-1.5 mt-1.5">
                            {entryPhotos.slice(0, 4).map((url, i) => (
                              <div key={i} className="w-10 h-10 rounded overflow-hidden border border-[#E5E7EB]">
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {entryPhotos.length > 4 && (
                              <div className="w-10 h-10 rounded bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center">
                                <span className="text-[10px] text-[#6B7280]">+{entryPhotos.length - 4}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-[#9CA3AF] mt-1">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
