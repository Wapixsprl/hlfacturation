'use client'

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Devis, DevisLigne, Client, Produit, AcompteConfig } from '@/types/database'
import { calculerLigne, calculerTotauxAvecRemiseGlobale, formatMontant, isExonerationIntracom, MENTION_EXONERATION_INTRACOM } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericInput } from '@/components/shared/NumericInput'
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
import { Plus, Trash2, Save, Loader2, GripVertical, Send, FileOutput, Lock, Receipt, PenLine, Globe, Clock, Monitor, Paperclip, UserPlus, CheckCircle } from 'lucide-react'
import { ClientDialog } from '@/components/clients/ClientDialog'
import { SearchSelect } from '@/components/shared/SearchSelect'
import { PiecesJointesUploader } from '@/components/shared/PiecesJointesUploader'
import type { PieceJointe } from '@/types/database'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ScrollButtons } from '@/components/shared/ScrollButtons'

let _devisLigneUid = 0
const genLigneUid = () => `dl-${++_devisLigneUid}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SortableLigneItem({ id, children }: { id: string; children: (h: any) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return <div ref={setNodeRef} style={style}>{children({ ...attributes, ...listeners })}</div>
}

interface LigneForm {
  id?: string
  _uid?: string
  type: 'produit' | 'texte' | 'section' | 'saut_page'
  produit_id: string | null
  designation: string
  description: string
  quantite: number
  unite: string
  prix_unitaire_ht: number
  remise_type: 'pct' | 'montant'
  remise_pct: number
  remise_montant: number
  taux_tva: number
  total_ht: number
  is_option: boolean
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
    _uid: l.id,
    type: l.type as LigneForm['type'],
    produit_id: l.produit_id,
    designation: l.designation || '',
    description: l.description || '',
    quantite: l.quantite,
    unite: l.unite || 'piece',
    prix_unitaire_ht: l.prix_unitaire_ht,
    remise_type: l.remise_type || 'pct',
    remise_pct: l.remise_pct,
    remise_montant: l.remise_montant || 0,
    taux_tva: l.taux_tva,
    total_ht: l.total_ht,
    is_option: l.is_option || false,
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
    remise_type: 'pct',
    remise_pct: 0,
    remise_montant: 0,
    taux_tva: 21,
    total_ht: 0,
    is_option: false,
  }
}

export function DevisForm({ devis, initialLignes, clients: initialClients, produits }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!devis
  const isReadOnly = !!devis && (devis.statut === 'accepte' || devis.statut === 'converti')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)
  const [localClients, setLocalClients] = useState<Client[]>(initialClients)

  // --- Auto-save ---
  const autoSaveIdRef = useRef<string | null>(devis?.id || null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRenderRef = useRef(true)
  const formValuesRef = useRef<Record<string, unknown>>({})
  const [showNewClientDialog, setShowNewClientDialog] = useState(false)

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
    const selectedClient = localClients.find((c) => c.id === newClientId)
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
  const [adresseChantier, setAdresseChantier] = useState(
    devis?.adresse_chantier || ''
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

  // --- Remise globale ---
  const [remiseGlobaleType, setRemiseGlobaleType] = useState<'pct' | 'montant'>(
    devis?.remise_globale_type || 'pct'
  )
  const [remiseGlobaleValeur, setRemiseGlobaleValeur] = useState(
    devis?.remise_globale_type === 'montant'
      ? (devis?.remise_globale_montant || 0)
      : (devis?.remise_globale_pct || 0)
  )
  const [remiseGlobaleLibelle, setRemiseGlobaleLibelle] = useState(
    devis?.remise_globale_libelle || ''
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

  // --- Pièces jointes ---
  const [piecesJointes, setPiecesJointes] = useState<PieceJointe[]>(
    (devis?.pieces_jointes as PieceJointe[]) || []
  )

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
          const remise = ligne.remise_type === 'montant' ? ligne.remise_montant : ligne.remise_pct
          const { ht } = calculerLigne(ligne.quantite, ligne.prix_unitaire_ht, remise, ligne.taux_tva, ligne.remise_type)
          ligne.total_ht = ht
        }
        next[index] = ligne
        return next
      })
    },
    []
  )

  const designationRefs = useRef<(HTMLInputElement | null)[]>([])
  const [shouldFocusLast, setShouldFocusLast] = useState(false)

  useEffect(() => {
    if (shouldFocusLast) {
      setShouldFocusLast(false)
      const lastIndex = lignes.length - 1
      if (lastIndex >= 0) designationRefs.current[lastIndex]?.focus()
    }
  })

  const addLigne = (type: LigneForm['type'] = 'produit') => {
    setLignes((prev) => [...prev, { ...createEmptyLigne(type), _uid: genLigneUid() }])
    setShouldFocusLast(true)
  }

  const removeLigne = (index: number) => {
    setLignes((prev) => prev.filter((_, i) => i !== index))
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLignes((prev) => {
        const oldIndex = prev.findIndex(l => l._uid === active.id)
        const newIndex = prev.findIndex(l => l._uid === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
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
  const lignesHorsOption = produitLignes.filter((l) => !l.is_option)
  const lignesOption = produitLignes.filter((l) => l.is_option)
  const totaux = calculerTotauxAvecRemiseGlobale(
    lignesHorsOption.map((l) => ({ total_ht: l.total_ht, taux_tva: l.taux_tva })),
    remiseGlobaleType,
    remiseGlobaleValeur
  )
  const totalOptions = Math.round(lignesOption.reduce((s, l) => s + l.total_ht, 0) * 100) / 100

  // --- Auto-save logic ---
  // Update form values ref every render so handleAutoSave never has stale closures
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    formValuesRef.current = {
      clientId, titre, referenceChantier, adresseChantier, dateDevis, dateValidite,
      conditionsPaiement, introduction, conclusion, notesInternes,
      remiseGlobaleType, remiseGlobaleValeur, remiseGlobaleLibelle,
      acomptes, lignes, piecesJointes,
    }
  })

  const handleAutoSave = useCallback(async () => {
    const v = formValuesRef.current as {
      clientId: string; titre: string; referenceChantier: string; adresseChantier: string
      dateDevis: string; dateValidite: string; conditionsPaiement: string; introduction: string
      conclusion: string; notesInternes: string; remiseGlobaleType: 'pct' | 'montant'
      remiseGlobaleValeur: number; remiseGlobaleLibelle: string; acomptes: AcompteConfig[]
      lignes: LigneForm[]; piecesJointes: PieceJointe[]
    }
    if (!v.clientId) return

    setAutoSaveStatus('saving')

    const produitLignesCalc = v.lignes.filter((l) => l.type === 'produit')
    const totauxCalc = calculerTotauxAvecRemiseGlobale(
      produitLignesCalc.map((l) => ({ total_ht: l.total_ht, taux_tva: l.taux_tva })),
      v.remiseGlobaleType,
      v.remiseGlobaleValeur
    )

    const devisData = {
      client_id: v.clientId,
      titre: v.titre || null,
      reference_chantier: v.referenceChantier || null,
      adresse_chantier: v.adresseChantier || null,
      date_devis: v.dateDevis,
      date_validite: v.dateValidite || null,
      conditions_paiement: v.conditionsPaiement || null,
      acomptes_config: v.acomptes.length > 0 ? v.acomptes : [],
      introduction: v.introduction || null,
      conclusion: v.conclusion || null,
      notes_internes: v.notesInternes || null,
      total_ht: totauxCalc.totalHT,
      total_tva: totauxCalc.totalTVA,
      total_ttc: totauxCalc.totalTTC,
      remise_globale_type: v.remiseGlobaleType,
      remise_globale_pct: v.remiseGlobaleType === 'pct' ? v.remiseGlobaleValeur : 0,
      remise_globale_montant: v.remiseGlobaleType === 'montant' ? v.remiseGlobaleValeur : 0,
      remise_globale_libelle: v.remiseGlobaleLibelle || null,
      pieces_jointes: v.piecesJointes.length > 0 ? v.piecesJointes : [],
    }

    try {
      let targetId = autoSaveIdRef.current

      if (targetId) {
        const { error } = await supabase.from('devis').update(devisData).eq('id', targetId)
        if (error) throw error
        await supabase.from('devis_lignes').delete().eq('devis_id', targetId)
      } else {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) throw new Error('Non authentifié')
        const { data: utilisateur } = await supabase
          .from('utilisateurs').select('entreprise_id').eq('id', authData.user.id).single()
        if (!utilisateur) throw new Error('Utilisateur non trouvé')
        const { data: entrepriseData } = await supabase
          .from('entreprises').select('prefixe_devis').eq('id', utilisateur.entreprise_id).single()
        const prefixeDevis = entrepriseData?.prefixe_devis || 'DEV'
        const { data: numResult } = await supabase.rpc('generate_numero', {
          p_type: prefixeDevis,
          p_entreprise_id: utilisateur.entreprise_id,
        })
        const { data: newDevis, error } = await supabase
          .from('devis')
          .insert({ ...devisData, entreprise_id: utilisateur.entreprise_id, numero: numResult as string })
          .select().single()
        if (error) throw error
        targetId = newDevis.id
        autoSaveIdRef.current = targetId
        window.history.replaceState(null, '', `/devis/${targetId}`)
      }

      if (v.lignes.length > 0 && targetId) {
        const lignesData = v.lignes.map((l, i) => ({
          devis_id: targetId,
          ordre: i,
          type: l.type,
          produit_id: l.produit_id || null,
          designation: l.designation || null,
          description: l.description || null,
          quantite: l.quantite,
          unite: l.unite,
          prix_unitaire_ht: l.prix_unitaire_ht,
          remise_type: l.remise_type,
          remise_pct: l.remise_pct,
          remise_montant: l.remise_montant,
          taux_tva: l.taux_tva,
          total_ht: l.total_ht,
          is_option: l.is_option,
        }))
        const { error: lignesError } = await supabase.from('devis_lignes').insert(lignesData)
        if (lignesError) throw lignesError
      }

      setAutoSaveStatus('saved')
      setTimeout(() => setAutoSaveStatus(s => s === 'saved' ? 'idle' : s), 3000)
    } catch (err) {
      console.error('Auto-save error:', err)
      setAutoSaveStatus('error')
      setTimeout(() => setAutoSaveStatus(s => s === 'error' ? 'idle' : s), 5000)
    }
  }, [supabase])

  // Trigger auto-save 3s after any form change
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
    if (isReadOnly) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(handleAutoSave, 3000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, titre, referenceChantier, adresseChantier, dateDevis, dateValidite,
      conditionsPaiement, introduction, conclusion, notesInternes,
      remiseGlobaleType, remiseGlobaleValeur, remiseGlobaleLibelle,
      acomptes, lignes, piecesJointes])

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

    // Cancel any pending auto-save to avoid race condition
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    setSaving(true)

    try {
      const devisData = {
        client_id: clientId,
        titre: titre || null,
        reference_chantier: referenceChantier || null,
        adresse_chantier: adresseChantier || null,
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
        remise_globale_type: remiseGlobaleType,
        remise_globale_pct: remiseGlobaleType === 'pct' ? remiseGlobaleValeur : 0,
        remise_globale_montant: remiseGlobaleType === 'montant' ? remiseGlobaleValeur : 0,
        remise_globale_libelle: remiseGlobaleLibelle || null,
        pieces_jointes: piecesJointes.length > 0 ? piecesJointes : [],
      }

      // Use auto-saved ID if available (doc was already created by auto-save)
      let devisId = devis?.id || autoSaveIdRef.current

      if (devisId) {
        const { error } = await supabase
          .from('devis')
          .update(devisData)
          .eq('id', devisId)
        if (error) throw error

        // Delete existing lines then re-insert
        await supabase.from('devis_lignes').delete().eq('devis_id', devisId)
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
        remise_type: l.remise_type,
        remise_pct: l.remise_pct,
        remise_montant: l.remise_montant,
        taux_tva: l.taux_tva,
        total_ht: l.total_ht,
        is_option: l.is_option,
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
      router.refresh()
    }
    setSending(false)
    setConfirmSend(false)
  }

  // --- Helpers ---
  const clientDisplayName = (c: Client) => {
    if (c.type === 'professionnel' && c.raison_sociale) return c.raison_sociale
    return [c.prenom, c.nom].filter(Boolean).join(' ') || '\u2014'
  }

  const clientOptions = localClients.map((c) => ({
    value: c.id,
    label: clientDisplayName(c),
    sublabel: c.email || c.telephone || undefined,
  }))

  // Numérotation automatique sections + lignes
  const ligneNums: Record<number, string | null> = {}
  let _sNum = 0, _lNum = 0
  lignes.forEach((ligne, i) => {
    if (ligne.type === 'section') { _sNum++; _lNum = 0; ligneNums[i] = String(_sNum) }
    else if (ligne.type === 'produit' && _sNum > 0) { _lNum++; ligneNums[i] = `${_sNum}.${_lNum}` }
    else ligneNums[i] = null
  })

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
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchSelect
                  options={clientOptions}
                  value={clientId}
                  onChange={handleClientChange}
                  placeholder="Rechercher un client..."
                  disabled={isReadOnly}
                />
              </div>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewClientDialog(true)}
                  title="Ajouter un nouveau client"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              )}
            </div>
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
            <Label>Adresse du chantier</Label>
            <Input
              value={adresseChantier}
              onChange={(e) => setAdresseChantier(e.target.value)}
              placeholder="Ex: Rue de la Loi 16, 7500 Tournai"
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={lignes.map(l => l._uid ?? String(l.id))} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {/* En-têtes colonnes */}
              <div className="hidden md:grid md:grid-cols-7 gap-2 px-3 pl-10 text-xs text-muted-foreground font-medium">
                <div className="col-span-2">Désignation</div>
                <div>Qté</div>
                <div>Unité</div>
                <div>PU HT</div>
                <div>Remise</div>
                <div className="text-right">Total HT</div>
              </div>
              {lignes.map((ligne, index) => {
                // Compute section subtotal: show after last product before next section
                let sectionSubtotal: number | null = null
                if (ligne.type === 'produit') {
                  // Check if next line is a section, saut_page, or end of array
                  const nextLine = lignes[index + 1]
                  if (!nextLine || nextLine.type === 'section' || nextLine.type === 'saut_page') {
                    // Find the section header above this product
                    let hasSection = false
                    let subtotal = 0
                    for (let j = index; j >= 0; j--) {
                      if (lignes[j].type === 'section') { hasSection = true; break }
                      if (lignes[j].type === 'produit') subtotal += lignes[j].total_ht
                    }
                    if (hasSection) sectionSubtotal = subtotal
                  }
                }

                return (
                <SortableLigneItem key={ligne._uid ?? String(index)} id={ligne._uid ?? String(index)}>
                  {(dragHandleProps) => (
                <div>
                <div className="border rounded-lg p-3">
                  {ligne.type === 'section' ? (
                    /* ---- SECTION ---- */
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" {...dragHandleProps} />
                      <div className="flex-1 flex items-center gap-2">
                        {ligneNums[index] ? (
                          <span className="text-sm font-bold text-[#1B3A6B] shrink-0 min-w-[1.5rem] tabular-nums">
                            {ligneNums[index]}
                          </span>
                        ) : (
                          <span className="text-xs font-medium uppercase text-muted-foreground shrink-0">Section</span>
                        )}
                        <Input
                          ref={(el) => { designationRefs.current[index] = el }}
                          value={ligne.designation}
                          onChange={(e) =>
                            updateLigne(index, {
                              designation: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isReadOnly) { e.preventDefault(); addLigne('produit') }
                          }}
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
                        {ligneNums[index] && (
                          <span className="text-xs font-mono font-semibold text-[#6B7280] w-7 shrink-0 tabular-nums">
                            {ligneNums[index]}
                          </span>
                        )}
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
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateLigne(index, { is_option: !ligne.is_option })}
                              title={ligne.is_option ? 'Retirer l\'option' : 'Marquer en option'}
                              className={`shrink-0 px-2 py-1 text-[10px] font-semibold rounded border transition-colors ${
                                ligne.is_option
                                  ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                                  : 'bg-transparent text-[#9CA3AF] border-[#E5E7EB] hover:border-amber-300 hover:text-amber-600'
                              }`}
                            >
                              {ligne.is_option ? 'EN OPTION' : 'Option'}
                            </button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLigne(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                        <div className="col-span-2">
                          <Input
                            ref={(el) => { designationRefs.current[index] = el }}
                            value={ligne.designation}
                            onChange={(e) =>
                              updateLigne(index, {
                                designation: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isReadOnly) { e.preventDefault(); addLigne('produit') }
                            }}
                            placeholder="Désignation"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <NumericInput
                            value={ligne.quantite}
                            onChange={(v) => updateLigne(index, { quantite: v })}
                            placeholder="Qté"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div>
                          <select
                            value={ligne.unite}
                            onChange={(e) => updateLigne(index, { unite: e.target.value })}
                            disabled={isReadOnly}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs disabled:opacity-50"
                          >
                            <option value="piece">pce</option>
                            <option value="h">h</option>
                            <option value="j">jour</option>
                            <option value="forfait">forfait</option>
                            <option value="m2">m²</option>
                            <option value="m3">m³</option>
                            <option value="ml">ml</option>
                            <option value="lot">lot</option>
                            <option value="kg">kg</option>
                            <option value="l">L</option>
                            <option value="autre">autre</option>
                          </select>
                        </div>
                        <div>
                          <NumericInput
                            value={ligne.prix_unitaire_ht}
                            onChange={(v) => updateLigne(index, { prix_unitaire_ht: v })}
                            placeholder="PU HT"
                            disabled={isReadOnly}
                          />
                        </div>
                        <div className="flex gap-1">
                          <NumericInput
                            value={ligne.remise_type === 'montant' ? ligne.remise_montant : ligne.remise_pct}
                            onChange={(v) => updateLigne(index, ligne.remise_type === 'montant' ? { remise_montant: v } : { remise_pct: v })}
                            placeholder={ligne.remise_type === 'pct' ? 'Remise %' : 'Remise €'}
                            disabled={isReadOnly}
                            className="min-w-0"
                          />
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => updateLigne(index, {
                                remise_type: ligne.remise_type === 'pct' ? 'montant' : 'pct',
                                remise_pct: 0,
                                remise_montant: 0,
                              })}
                              className="shrink-0 px-2 text-xs border rounded-md bg-muted hover:bg-muted/80 font-medium"
                              title="Basculer % / €"
                            >
                              {ligne.remise_type === 'pct' ? '%' : '€'}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-center">
                          <span className={`font-mono text-sm font-medium ${ligne.is_option ? 'text-amber-600' : ''}`}>
                            {formatMontant(ligne.total_ht)}
                          </span>
                          {ligne.is_option && (
                            <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wide">option</span>
                          )}
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
                {sectionSubtotal !== null && (
                  <div className="flex justify-end mt-1.5 pr-3">
                    <div className="flex items-center gap-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-md px-4 py-1.5">
                      <span className="text-xs font-medium text-[#0369A1]">Sous-total section</span>
                      <span className="text-sm font-bold text-[#0C4A6E] font-mono">{formatMontant(sectionSubtotal)}</span>
                    </div>
                  </div>
                )}
                </div>
                  )}
                </SortableLigneItem>
                )
              })}
            </div>
              </SortableContext>
            </DndContext>
          )}
          {!isReadOnly && lignes.length > 0 && (
            <div className="flex gap-2 mt-4">
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
          )}
        </CardContent>
      </Card>

      {/* Totaux */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-2">
            {totaux.remiseMontant > 0 && (
              <div className="flex justify-between w-64">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span className="font-mono">{formatMontant(totaux.sousTotal)}</span>
              </div>
            )}
            {/* Remise globale input */}
            {!isReadOnly && (
              <div className="flex flex-col gap-1 w-64">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm shrink-0">Remise globale</span>
                  <div className="flex gap-1 flex-1">
                    <NumericInput
                      value={remiseGlobaleValeur}
                      onChange={setRemiseGlobaleValeur}
                      placeholder={remiseGlobaleType === 'pct' ? '0 %' : '0 €'}
                      className="h-7 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { setRemiseGlobaleType(t => t === 'pct' ? 'montant' : 'pct'); setRemiseGlobaleValeur(0) }}
                      className="shrink-0 px-2 text-xs border rounded-md bg-muted hover:bg-muted/80 font-medium h-7"
                    >
                      {remiseGlobaleType === 'pct' ? '%' : '€'}
                    </button>
                  </div>
                </div>
                <Input
                  value={remiseGlobaleLibelle}
                  onChange={(e) => setRemiseGlobaleLibelle(e.target.value)}
                  placeholder="Libellé remise (ex: Remise fidélité)"
                  className="h-7 text-xs text-muted-foreground"
                />
              </div>
            )}
            {totaux.remiseMontant > 0 && (
              <div className="flex justify-between w-64 text-[#DC2626]">
                <span>Remise</span>
                <span className="font-mono">-{formatMontant(totaux.remiseMontant)}</span>
              </div>
            )}
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-mono">{formatMontant(totaux.totalHT)}</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">TVA</span>
              <span className="font-mono">{formatMontant(totaux.totalTVA)}</span>
            </div>
            <Separator className="w-64" />
            <div className="flex justify-between w-64">
              <span className="font-semibold">Total TTC</span>
              <span className="font-mono font-bold text-lg">{formatMontant(totaux.totalTTC)}</span>
            </div>
            {totalOptions > 0 && (
              <div className="flex justify-between w-64 mt-2 pt-2 border-t border-amber-200">
                <span className="text-amber-700 text-sm font-medium">Options (non incluses)</span>
                <span className="font-mono text-sm text-amber-700">{formatMontant(totalOptions)}</span>
              </div>
            )}
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
                        <NumericInput
                          value={acompte.pourcentage}
                          onChange={(v) => updateAcompte(index, { pourcentage: v })}
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

              {/* Encadré conditions de paiement auto-généré */}
              <div className="mt-4 rounded-lg border border-[#1B3A6B]/20 bg-[#F0F4FA] px-4 py-3 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#1B3A6B]">
                  Conditions de paiement
                </p>
                {acomptes.map((a, i) => {
                  const ordinal = i === 0 ? '1er' : `${i + 1}ème`
                  const montant = formatMontant(Math.round(totaux.totalTTC * (a.pourcentage / 100) * 100) / 100)
                  const label = a.label ? ` — ${a.label}` : ''
                  return (
                    <p key={i} className="text-[12px] text-[#1B3A6B]">
                      <span className="font-semibold">{ordinal} acompte : {a.pourcentage}%</span>
                      {label}
                      <span className="font-mono ml-1 text-[#1B3A6B]/80">({montant})</span>
                    </p>
                  )
                })}
                {totalPourcentageAcomptes < 100 && (
                  <p className="text-[12px] text-[#1B3A6B]">
                    <span className="font-semibold">Solde : {100 - totalPourcentageAcomptes}%</span>
                    <span className="font-mono ml-1 text-[#1B3A6B]/80">
                      ({formatMontant(Math.round(totaux.totalTTC * ((100 - totalPourcentageAcomptes) / 100) * 100) / 100)})
                    </span>
                  </p>
                )}
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

      {/* Pièces jointes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Pièces jointes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PiecesJointesUploader
            value={piecesJointes}
            onChange={setPiecesJointes}
            docType="devis"
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex items-center justify-end gap-3 pb-6">
        {/* Indicateur auto-save */}
        {!isReadOnly && autoSaveStatus !== 'idle' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-auto">
            {autoSaveStatus === 'saving' && (
              <><Loader2 className="h-3 w-3 animate-spin" /><span>Sauvegarde automatique...</span></>
            )}
            {autoSaveStatus === 'saved' && (
              <><CheckCircle className="h-3 w-3 text-[#059669]" /><span className="text-[#059669]">Brouillon sauvegardé</span></>
            )}
            {autoSaveStatus === 'error' && (
              <span className="text-red-500">Erreur de sauvegarde auto</span>
            )}
          </div>
        )}
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

      <ClientDialog
        open={showNewClientDialog}
        onOpenChange={setShowNewClientDialog}
        client={null}
        onSuccess={(newClient) => {
          if (newClient) {
            setLocalClients((prev) => [...prev, newClient].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')))
            setClientId(newClient.id)
          }
        }}
      />
      <ScrollButtons />
    </div>
  )
}
