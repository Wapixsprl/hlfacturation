'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Devis, DevisLigne, Client, Produit, AcompteConfig } from '@/types/database'
import { calculerLigne, calculerTotaux, formatMontant, isExonerationIntracom, MENTION_EXONERATION_INTRACOM } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Loader2, GripVertical, Send, FileOutput, Lock, Receipt, PenLine, Globe, Clock, Monitor } from 'lucide-react'
import { SearchSelect } from '@/components/shared/SearchSelect'

interface LigneForm {
  id?: string
  type: 'produit' | 'texte' | 'section' | 'saut_page'
  produit_id: string | null
  designation: string
  description: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  remise_pct: number
  taux_tva: number
  total_ht: number
}

interface Props {
  devis?: Devis
  initialLignes?: DevisLigne[]
  clients: Client[]
  produits: Produit[]
}

function mapLigneFromDB(l: DevisLigne): LigneForm {
  return {
    id: l.id,
    type: l.type as LigneForm['type'],
    produit_id: l.produit_id,
    designation: l.designation || '',
    description: l.description || '',
    quantite: l.quantite,
    unite: l.unite || 'piece',
    prix_unitaire_ht: l.prix_unitaire_ht,
    remise_pct: l.remise_pct,
    taux_tva: l.taux_tva,
    total_ht: l.total_ht,
  }
}

function createEmptyLigne(type: LigneForm['type'] = 'produit'): LigneForm {
  return {
    type,
    produit_id: null,
    designation: type === 'section' ? 'Nouvelle section' : '',
    description: '',
    quantite: 1,
    unite: 'piece',
    prix_unitaire_ht: 0,
    remise_pct: 0,
    taux_tva: 21,
    total_ht: 0,
  }
}

export function DevisForm({ devis, initialLignes, clients, produits }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!devis
  const isReadOnly = !!devis && (devis.statut === 'accepte' || devis.statut === 'converti')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)

  // --- Exonération intracommunautaire ---
  const [exonerationIntracom, setExonerationIntracom] = useState(() => {
    if (devis?.client_id) {
      // Check from initial client
      return false // Will be computed after client list is available
    }
    return false
  })

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId)
    const selectedClient = clients.find((c) => c.id === newClientId)
    if (selectedClient && isExonerationIntracom(selectedClient)) {
      setExonerationIntracom(true)
      // Mettre toutes les lignes a 0% TVA
      setLignes((prev) =>
        prev.map((l) =>
          l.type === 'produit' ? { ...l, taux_tva: 0, total_ht: calculerLigne(l.quantite, l.prix_unitaire_ht, l.remise_pct, 0).ht } : l
        )
      )
      toast.info('Client intracommunautaire FR detecte - TVA a 0% appliquee automatiquement')
    } else {
      setExonerationIntracom(false)
    }
  }

  // --- Form state ---
  const [clientId, setClientId] = useState(devis?.client_id || '')
  const [titre, setTitre] = useState(devis?.titre || '')
  const [referenceChantier, setReferenceChantier] = useState(
    devis?.reference_chantier || ''
  )
  const [dateDevis, setDateDevis] = useState(
    devis?.date_devis || new Date().toISOString().split('T')[0]
  )
  const [dateValidite, setDateValidite] = useState(
    devis?.date_validite || ''
  )
  const [conditionsPaiement, setConditionsPaiement] = useState(
    devis?.conditions_paiement || 'Comptant'
  )
  const [introduction, setIntroduction] = useState(
    devis?.introduction || ''
  )
  const [conclusion, setConclusion] = useState(devis?.conclusion || '')
  const [notesInternes, setNotesInternes] = useState(
    devis?.notes_internes || ''
  )

  // --- Acomptes state ---
  const [acomptes, setAcomptes] = useState<AcompteConfig[]>(
    (devis?.acomptes_config as AcompteConfig[]) || []
  )

  const addAcompte = () => {
    setAcomptes((prev) => {
      const currentTotal = prev.reduce((sum, a) => sum + a.pourcentage, 0)
      const remaining = Math.max(0, 100 - currentTotal)
      const defaultPct = Math.min(30, remaining)
      if (remaining <= 0) return prev // Can't add if already at 100%
      return [...prev, { pourcentage: defaultPct, label: '' }]
    })
  }

  const updateAcompte = (index: number, updates: Partial<AcompteConfig>) => {
    setAcomptes((prev) => {
      const next = [...prev]
      // If updating pourcentage, clamp to not exceed 100% total
      if (updates.pourcentage !== undefined) {
        const otherTotal = prev.reduce((sum, a, i) => (i !== index ? sum + a.pourcentage : sum), 0)
        const maxAllowed = 100 - otherTotal
        updates.pourcentage = Math.min(Math.max(0, updates.pourcentage), maxAllowed)
      }
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  const removeAcompte = (index: number) => {
    setAcomptes((prev) => prev.filter((_, i) => i !== index))
  }

  const totalPourcentageAcomptes = acomptes.reduce((sum, a) => sum + a.pourcentage, 0)

  // --- Lines state ---
  const [lignes, setLignes] = useState<LigneForm[]>(
    initialLignes?.map(mapLigneFromDB) || []
  )

  const updateLigne = useCallback(
    (index: number, updates: Partial<LigneForm>) => {
      setLignes((prev) => {
        const next = [...prev]
        const ligne = { ...next[index], ...updates }
        if (ligne.type === 'produit') {
          const { ht } = calculerLigne(
            ligne.quantite,
            ligne.prix_unitaire_ht,
            ligne.remise_pct,
            ligne.taux_tva
          )
          ligne.total_ht = ht
        }
        next[index] = ligne
        return next
      })
    },
    []
  )

  const addLigne = (type: LigneForm['type'] = 'produit') => {
    setLignes((prev) => [...prev, createEmptyLigne(type)])
  }

  const removeLigne = (index: number) => {
    setLignes((prev) => prev.filter((_, i) => i !== index))
  }

  const selectProduit = (index: number, produitId: string) => {
    const p = produits.find((pr) => pr.id === produitId)
    if (!p) return
    updateLigne(index, {
      produit_id: produitId,
      designation: p.designation,
      description: p.description || '',
      prix_unitaire_ht: p.prix_ht,
      taux_tva: p.taux_tva,
      unite: p.unite,
    })
  }

  // --- Totals ---
  const produitLignes = lignes.filter((l) => l.type === 'produit')
  const totaux = calculerTotaux(
    produitLignes.map((l) => ({
      total_ht: l.total_ht,
      taux_tva: l.taux_tva,
    }))
  )

  // --- Save ---
  const handleSave = async () => {
    if (!clientId) {
      toast.error('Veuillez sélectionner un client')
      return
    }
    if (lignes.length === 0) {
      toast.error('Ajoutez au moins une ligne au devis')
      return
    }

    setSaving(true)

    try {
      const devisData = {
        client_id: clientId,
        titre: titre || null,
        reference_chantier: referenceChantier || null,
        date_devis: dateDevis,
        date_validite: dateValidite || null,
        conditions_paiement: conditionsPaiement || null,
        acomptes_config: acomptes.length > 0 ? acomptes : [],
        introduction: introduction || null,
        conclusion: conclusion || null,
        notes_internes: notesInternes || null,
        total_ht: totaux.totalHT,
        total_tva: totaux.totalTVA,
        total_ttc: totaux.totalTTC,
      }

      let devisId = devis?.id

      if (isEdit) {
        const { error } = await supabase
          .from('devis')
          .update(devisData)
          .eq('id', devisId!)
        if (error) throw error

        // Delete existing lines then re-insert
        await supabase.from('devis_lignes').delete().eq('devis_id', devisId!)
      } else {
        // Get user's entreprise_id
        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) throw new Error('Non authentifié')

        const { data: utilisateur } = await supabase
          .from('utilisateurs')
          .select('entreprise_id')
          .eq('id', authData.user.id)
          .single()
        if (!utilisateur) throw new Error('Utilisateur non trouvé')

        // Fetch custom prefix from entreprise settings
        const { data: entrepriseData } = await supabase
          .from('entreprises')
          .select('prefixe_devis')
          .eq('id', utilisateur.entreprise_id)
          .single()
        const prefixeDevis = entrepriseData?.prefixe_devis || 'DEV'

        // Generate numero via PostgreSQL function (sequential, no gaps)
        const { data: numResult } = await supabase.rpc('generate_numero', {
          p_type: prefixeDevis,
          p_entreprise_id: utilisateur.entreprise_id,
        })

        const { data: newDevis, error } = await supabase
          .from('devis')
          .insert({
            ...devisData,
            entreprise_id: utilisateur.entreprise_id,
            numero: numResult as string,
          })
          .select()
          .single()
        if (error) throw error
        devisId = newDevis.id
      }

      // Insert all lines
      const lignesData = lignes.map((l, i) => ({
        devis_id: devisId!,
        ordre: i,
        type: l.type,
        produit_id: l.produit_id || null,
        designation: l.designation || null,
        description: l.description || null,
        quantite: l.quantite,
        unite: l.unite,
        prix_unitaire_ht: l.prix_unitaire_ht,
        remise_pct: l.remise_pct,
        taux_tva: l.taux_tva,
        total_ht: l.total_ht,
      }))

      const { error: lignesError } = await supabase
        .from('devis_lignes')
        .insert(lignesData)
      if (lignesError) throw lignesError

      toast.success(isEdit ? 'Devis modifié avec succès' : 'Devis créé avec succès')
      router.push('/devis')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde')
    }

    setSaving(false)
  }

  // --- Send ---
  const handleEnvoyer = async () => {
    if (!devis) return
    setSending(true)
    try {
      const res = await fetch(`/api/devis/${devis.id}/envoyer`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'envoi")
      } else if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success('Devis envoyé avec succès !')
        router.push('/devis')
        router.refresh()
      }
    } catch {
      toast.error("Erreur lors de l'envoi du devis")
    }
    setSending(false)
    setConfirmSend(false)
  }

  // --- Helpers ---
  const clientDisplayName = (c: Client) => {
    if (c.type === 'professionnel' && c.raison_sociale) return c.raison_sociale
    return [c.prenom, c.nom].filter(Boolean).join(' ') || '\u2014'
  }

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: clientDisplayName(c),
    sublabel: c.email || c.telephone || undefined,
  }))

  return (
    <div className="space-y-6">
      {/* Read-only banner for signed devis */}
      {isReadOnly && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#EBEBEB]/60 bg-[#F5F5F5] px-5 py-4">
          <Lock className="h-5 w-5 text-[#ADADAD] shrink-0" />
          <div>
            <p className="text-[14px] font-medium text-[#141414]">
              Ce devis a été signé et ne peut plus être modifié.
            </p>
            <p className="text-[13px] text-[#707070]">
              Vous pouvez le convertir en facture ou retourner à la liste.
            </p>
          </div>
        </div>
      )}

      {/* Signature client — visible uniquement si le devis est signé */}
      {devis?.signature_image && (
        <Card className="border-[#059669]/30 bg-[#F0FDF4]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[#059669]">
              <PenLine className="h-5 w-5" />
              Signature du client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Signature image */}
              <div className="flex-shrink-0">
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={devis.signature_image}
                    alt="Signature du client"
                    className="max-w-[280px] max-h-[120px] object-contain"
                  />
                </div>
              </div>

              {/* Signature metadata */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#059669]/10 shrink-0">
                    <Clock className="h-4 w-4 text-[#059669]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">Date et heure</p>
                    <p className="text-[14px] font-medium text-[#111827]">
                      {devis.signature_date
                        ? new Intl.DateTimeFormat('fr-BE', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          }).format(new Date(devis.signature_date))
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#059669]/10 shrink-0">
                    <Globe className="h-4 w-4 text-[#059669]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">Adresse IP</p>
                    <p className="text-[14px] font-mono font-medium text-[#111827]">
                      {devis.signature_ip || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#059669]/10 shrink-0">
                    <Monitor className="h-4 w-4 text-[#059669]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">Navigateur</p>
                    <p className="text-[13px] text-[#6B7280] truncate">
                      {devis.signature_user_agent || '—'}
                    </p>
                  </div>
                </div>

                {devis.cgv_acceptees && (
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#059669]/10 shrink-0">
                      <Receipt className="h-4 w-4 text-[#059669]" />
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wide">CGV acceptees</p>
                      <p className="text-[14px] font-medium text-[#059669]">
                        Oui — {devis.cgv_acceptees_date
                          ? new Intl.DateTimeFormat('fr-BE', {
                              dateStyle: 'long',
                              timeStyle: 'short',
                            }).format(new Date(devis.cgv_acceptees_date))
                          : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <SearchSelect
              options={clientOptions}
              value={clientId}
              onChange={handleClientChange}
              placeholder="Rechercher un client..."
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Rénovation salle de bain"
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Référence chantier</Label>
            <Input
              value={referenceChantier}
              onChange={(e) => setReferenceChantier(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Conditions de paiement</Label>
            <Input
              value={conditionsPaiement}
              onChange={(e) => setConditionsPaiement(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Date du devis</Label>
            <Input
              type="date"
              value={dateDevis}
              onChange={(e) => setDateDevis(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Date de validité</Label>
            <Input
              type="date"
              value={dateValidite}
              onChange={(e) => setDateValidite(e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Introduction</Label>
            <Textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              rows={2}
              placeholder="Texte d'introduction du devis..."
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bandeau exonération intracommunautaire */}
      {exonerationIntracom && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-amber-600 text-sm font-bold">!</span>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Exoneration TVA intracommunautaire</p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Ce client est base en France avec un numero de TVA FR valide. La TVA est automatiquement a 0%.
            </p>
            <p className="text-[12px] font-medium text-amber-800 mt-1">
              Mention : {MENTION_EXONERATION_INTRACOM}
            </p>
          </div>
        </div>
      )}

      {/* Lignes du devis */}
      <Card>
        <CardHeader>
          <CardTitle>Lignes du devis</CardTitle>
          {!isReadOnly && (
            <CardAction>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addLigne('texte')}
                >
                  + Texte
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addLigne('section')}
                >
                  + Section
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#141414] hover:bg-[#141414]/90"
                  onClick={() => addLigne('produit')}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ligne
                </Button>
              </div>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {lignes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune ligne. Cliquez sur &laquo; + Ligne &raquo; pour commencer.
            </p>
          ) : (
            <div className="space-y-3">
              {lignes.map((ligne, index) => (
                <div key={index} className="border rounded-lg p-3">
                  {ligne.type === 'section' ? (
                    /* ---- SECTION ---- */
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs font-medium uppercase text-muted-foreground shrink-0">
                          Section
                        </span>
                        <Input
                          value={ligne.designation}
                          onChange={(e) =>
                            updateLigne(index, {
                              designation: e.target.value,
                            })
                          }
                          className="font-semibold"
                          placeholder="Titre de la section"
                          disabled={isReadOnly}
                        />
                      </div>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLigne(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ) : ligne.type === 'texte' ? (
                    /* ---- TEXTE ---- */
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                      <div className="flex-1">
                        <span className="text-xs font-medium uppercase text-muted-foreground mb-1 block">
                          Texte libre
                        </span>
                        <Textarea
                          value={ligne.designation}
                          onChange={(e) =>
                            updateLigne(index, {
                              designation: e.target.value,
                            })
                          }
                          rows={2}
                          placeholder="Texte libre..."
                          disabled={isReadOnly}
                        />
                      </div>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLigne(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* ---- PRODUIT ---- */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <select
                          value={ligne.produit_id || ''}
                          onChange={(e) =>
                            selectProduit(index, e.target.value)
                          }
                          disabled={isReadOnly}
                          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Produit du catalogue...</option>
                          {produits.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.reference
                                ? `${p.reference} - `
                                : ''}
                              {p.designation}
                            </option>
                          ))}
                        </select>
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLigne(index)}
                            className="ml-auto"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                        <div className="col-span-2">
                          <Input
                            value={ligne.designation}
                            onChange={(e) =>
                              updateLigne(index, {
                                designation: e.target.value,
                              })
                            }
                            placeholder="Désignation"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={ligne.quantite}
                            onChange={(e) =>
                              updateLigne(index, {
                                quantite:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="Qté"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={ligne.prix_unitaire_ht}
                            onChange={(e) =>
                              updateLigne(index, {
                                prix_unitaire_ht:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="PU HT"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={ligne.remise_pct}
                            onChange={(e) =>
                              updateLigne(index, {
                                remise_pct:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="Remise %"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div className="flex items-center justify-end font-mono text-sm font-medium">
                          {formatMontant(ligne.total_ht)}
                        </div>
                      </div>
                      {/* Description row */}
                      <div className="pl-7">
                        <Input
                          value={ligne.description}
                          onChange={(e) =>
                            updateLigne(index, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Description (optionnel)"
                          className="text-muted-foreground text-xs"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totaux */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-2">
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-mono">{formatMontant(totaux.totalHT)}</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">TVA</span>
              <span className="font-mono">
                {formatMontant(totaux.totalTVA)}
              </span>
            </div>
            <Separator className="w-64" />
            <div className="flex justify-between w-64">
              <span className="font-semibold">Total TTC</span>
              <span className="font-mono font-bold text-lg">
                {formatMontant(totaux.totalTTC)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Échéancier d'acomptes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Échéancier d&apos;acomptes
          </CardTitle>
          {!isReadOnly && (
            <CardAction>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addAcompte}
                disabled={totalPourcentageAcomptes >= 100}
              >
                <Plus className="h-4 w-4 mr-1" />
                Acompte
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {acomptes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Aucun acompte. Le paiement se fera en une seule fois selon les conditions indiquées.
            </p>
          ) : (
            <div className="space-y-3">
              {acomptes.map((acompte, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border rounded-lg p-3"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Pourcentage
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max={acompte.pourcentage + Math.max(0, 100 - totalPourcentageAcomptes)}
                          value={acompte.pourcentage}
                          onChange={(e) =>
                            updateAcompte(index, {
                              pourcentage:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                          disabled={isReadOnly}
                        />
                        <span className="text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Description
                      </Label>
                      <Input
                        value={acompte.label}
                        onChange={(e) =>
                          updateAcompte(index, {
                            label: e.target.value,
                          })
                        }
                        placeholder="Ex: A la signature du devis"
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Date d{"'"}echeance
                      </Label>
                      <Input
                        type="date"
                        value={acompte.date_echeance || ''}
                        onChange={(e) =>
                          updateAcompte(index, {
                            date_echeance: e.target.value || null,
                          })
                        }
                        disabled={isReadOnly}
                      />
                      <p className="text-[10px] text-[#9CA3AF]">
                        Email auto envoye a cette date
                      </p>
                    </div>
                    <div className="flex items-end justify-between sm:justify-end gap-3 h-full">
                      <span className="font-mono text-sm font-medium">
                        {formatMontant(
                          Math.round(
                            totaux.totalTTC *
                              (acompte.pourcentage / 100) *
                              100
                          ) / 100
                        )}
                      </span>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAcompte(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Total acomptes */}
              <div className="flex justify-end pt-2">
                <div className="text-sm space-y-1 text-right">
                  <div className={`font-medium ${totalPourcentageAcomptes === 100 ? 'text-[#059669]' : 'text-muted-foreground'}`}>
                    Total : {totalPourcentageAcomptes}%
                    {totalPourcentageAcomptes === 100 && (
                      <span className="ml-2 text-xs">(complet)</span>
                    )}
                  </div>
                  {totalPourcentageAcomptes < 100 && totalPourcentageAcomptes > 0 && (
                    <div className="text-muted-foreground text-xs">
                      Solde restant : {100 - totalPourcentageAcomptes}% ={' '}
                      {formatMontant(
                        Math.round(
                          totaux.totalTTC *
                            ((100 - totalPourcentageAcomptes) / 100) *
                            100
                        ) / 100
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conclusion & Notes internes */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Conclusion</Label>
            <Textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              rows={2}
              placeholder="Texte de conclusion du devis..."
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes internes (non visibles sur le PDF)</Label>
            <Textarea
              value={notesInternes}
              onChange={(e) => setNotesInternes(e.target.value)}
              rows={2}
              placeholder="Notes pour usage interne uniquement..."
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex justify-end gap-3 pb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/devis')}
        >
          {isReadOnly ? 'Retour' : 'Annuler'}
        </Button>
        {!isReadOnly && isEdit && devis && (devis.statut === 'brouillon' || devis.statut === 'envoye') && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmSend(true)}
            disabled={sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {devis.statut === 'envoye' ? 'Renvoyer au client' : 'Envoyer au client'}
          </Button>
        )}
        {isEdit && devis && (devis.statut === 'accepte' || devis.statut === 'envoye') && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/factures/nouveau?devis=${devis.id}`)}
          >
            <FileOutput className="h-4 w-4 mr-2" />
            Convertir en facture
          </Button>
        )}
        {!isReadOnly && (
          <Button
            onClick={handleSave}
            className="bg-[#141414] hover:bg-[#141414]/90"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEdit ? 'Enregistrer les modifications' : 'Créer le devis'}
          </Button>
        )}
      </div>

      {/* Confirmation dialog for sending */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le devis sera envoyé par email au client avec un PDF et un lien de
              signature électronique. Le statut passera à « Envoyé ».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnvoyer}
              disabled={sending}
              className="bg-[#141414] hover:bg-[#141414]/90"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
