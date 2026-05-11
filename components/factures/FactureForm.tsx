'use client'

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Facture, FactureLigne, Client, Produit, Devis, PaiementClient } from '@/types/database'
import { calculerLigne, calculerTotauxAvecRemiseGlobale, formatMontant, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericInput } from '@/components/shared/NumericInput'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Trash2, Save, Loader2, GripVertical, CreditCard, Send, Paperclip, UserPlus, CheckCircle } from 'lucide-react'
import { ClientDialog } from '@/components/clients/ClientDialog'
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
import { PaiementDialog } from './PaiementDialog'
import { PaymentLinkSection } from './PaymentLinkSection'
import { SearchSelect } from '@/components/shared/SearchSelect'
import { PiecesJointesUploader } from '@/components/shared/PiecesJointesUploader'
import type { PaymentSession, PieceJointe } from '@/types/database'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ScrollButtons } from '@/components/shared/ScrollButtons'

let _factureLigneUid = 0
const genFactureLigneUid = () => `fl-${++_factureLigneUid}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SortableLigneItem({ id, children }: { id: string; children: (h: any) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return <div ref={setNodeRef} style={style}>{children({ ...attributes, ...listeners })}</div>
}

interface LigneForm {
  id?: string
  _uid?: string
  type: 'produit' | 'texte' | 'section'
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
}

type DevisWithClient = Devis & { client: Client | null }

interface Props {
  facture?: Facture
  initialLignes?: FactureLigne[]
  initialPaiements?: PaiementClient[]
  paymentSessions?: PaymentSession[]
  paymentEnabled?: boolean
  clients: Client[]
  produits: Produit[]
  devisAcceptes: DevisWithClient[]
  preselectedDevisId?: string
  preselectedType?: string
}

function mapLigneFromDB(l: FactureLigne): LigneForm {
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
  }
}

const typeFactureOptions = [
  { value: 'facture', label: 'Facture' },
  { value: 'acompte', label: 'Acompte' },
  { value: 'avoir', label: 'Avoir' },
  { value: 'situation', label: 'Situation' },
]

const modesPaiementLabels: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  cash: 'Espèces',
  carte: 'Carte',
  mollie: 'Mollie',
  stripe: 'Stripe',
  autre: 'Autre',
}

export function FactureForm({
  facture,
  initialLignes,
  initialPaiements,
  paymentSessions,
  paymentEnabled,
  clients: initialClients,
  produits,
  devisAcceptes,
  preselectedDevisId,
  preselectedType,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!facture
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmSend, setConfirmSend] = useState(false)
  const [localClients, setLocalClients] = useState<Client[]>(initialClients)
  const [showNewClientDialog, setShowNewClientDialog] = useState(false)
  const isFactureReadOnly = isEdit && facture?.statut === 'payee'

  // --- Auto-save ---
  const autoSaveIdRef = useRef<string | null>(facture?.id || null)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRenderRef = useRef(true)
  const formValuesRef = useRef<Record<string, unknown>>({})
  const designationRefs = useRef<(HTMLInputElement | null)[]>([])
  const [shouldFocusLast, setShouldFocusLast] = useState(false)

  useEffect(() => {
    if (shouldFocusLast) {
      setShouldFocusLast(false)
      const lastIndex = lignes.length - 1
      if (lastIndex >= 0) designationRefs.current[lastIndex]?.focus()
    }
  })

  // Form state
  const [typeFacture, setTypeFacture] = useState<string>(
    facture?.type || preselectedType || 'facture'
  )
  const [clientId, setClientId] = useState(facture?.client_id || '')
  const [devisId, setDevisId] = useState(facture?.devis_id || '')
  const [dateFacture, setDateFacture] = useState(
    facture?.date_facture || new Date().toISOString().split('T')[0]
  )
  const [dateEcheance, setDateEcheance] = useState(
    facture?.date_echeance || ''
  )
  const [mentionTva, setMentionTva] = useState(facture?.mention_tva || '')
  const [conditionsPaiement, setConditionsPaiement] = useState(
    facture?.conditions_paiement || 'Comptant'
  )
  const [notesInternes, setNotesInternes] = useState(
    facture?.notes_internes || ''
  )

  // Acquittée à la création
  const [acquittee, setAcquittee] = useState(facture?.statut === 'payee')
  const [modePaiementAcquittee, setModePaiementAcquittee] = useState<'virement' | 'cheque' | 'cash' | 'carte' | 'autre'>('virement')

  // Remise globale
  const [remiseGlobaleType, setRemiseGlobaleType] = useState<'pct' | 'montant'>(
    facture?.remise_globale_type || 'pct'
  )
  const [remiseGlobaleValeur, setRemiseGlobaleValeur] = useState(
    facture?.remise_globale_type === 'montant'
      ? (facture?.remise_globale_montant || 0)
      : (facture?.remise_globale_pct || 0)
  )
  const [remiseGlobaleLibelle, setRemiseGlobaleLibelle] = useState(
    facture?.remise_globale_libelle || ''
  )

  // Acompte
  const [acomptePct, setAcomptePct] = useState<number>(facture?.acompte_pct ?? 30)
  const [devisTotalTTC, setDevisTotalTTC] = useState<number>(0)
  const [devisAvgTva, setDevisAvgTva] = useState<number>(21)

  // Pièces jointes
  const [piecesJointes, setPiecesJointes] = useState<PieceJointe[]>(
    (facture?.pieces_jointes as PieceJointe[]) || []
  )

  // Lines state
  const [lignes, setLignes] = useState<LigneForm[]>(
    initialLignes?.map(mapLigneFromDB) || []
  )

  // Paiements state
  const [paiements, setPaiements] = useState<PaiementClient[]>(
    initialPaiements || []
  )
  const [paiementDialogOpen, setPaiementDialogOpen] = useState(false)
  const preselectedRef = useRef(false)

  // Auto-select devis from URL param
  useEffect(() => {
    if (preselectedDevisId && !preselectedRef.current && devisAcceptes.length > 0) {
      preselectedRef.current = true
      const found = devisAcceptes.find((d) => d.id === preselectedDevisId)
      if (found) {
        handleDevisSelect(preselectedDevisId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedDevisId, devisAcceptes])

  // Init devisTotalTTC en mode édition si devis déjà lié
  useEffect(() => {
    if (facture?.devis_id && devisAcceptes.length > 0) {
      const found = devisAcceptes.find((d) => d.id === facture.devis_id) as (DevisWithClient & { total_ttc: number }) | undefined
      if (found) setDevisTotalTTC(found.total_ttc || 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devisAcceptes])

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

  const addLigne = (type: LigneForm['type'] = 'produit') => {
    setLignes((prev) => [...prev, { ...createEmptyLigne(type), _uid: genFactureLigneUid() }])
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

  // Import lines from devis
  const handleDevisSelect = async (selectedDevisId: string) => {
    setDevisId(selectedDevisId)
    if (!selectedDevisId) return

    const selectedDevis = devisAcceptes.find((d) => d.id === selectedDevisId)
    if (selectedDevis && selectedDevis.client_id) {
      setClientId(selectedDevis.client_id)
    }

    // Fetch devis lines
    const { data: devisLignes } = await supabase
      .from('devis_lignes')
      .select('*')
      .eq('devis_id', selectedDevisId)
      .order('ordre')

    if (selectedDevis) {
      setDevisTotalTTC((selectedDevis as DevisWithClient & { total_ttc: number }).total_ttc || 0)
    }

    if (devisLignes && devisLignes.length > 0) {
      // Calcul TVA moyen pondéré depuis les lignes produit
      const produitLines = devisLignes.filter(l => l.type === 'produit' && l.total_ht > 0)
      if (produitLines.length > 0) {
        const totalHT = produitLines.reduce((s, l) => s + l.total_ht, 0)
        const totalTVA = produitLines.reduce((s, l) => s + l.total_ht * l.taux_tva / 100, 0)
        const avgTva = totalHT > 0 ? Math.round(totalTVA / totalHT * 100) : 21
        setDevisAvgTva(avgTva)
      }

      const importedLignes: LigneForm[] = devisLignes
        .filter((l) => l.type !== 'saut_page')
        .map((l) => ({
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
        }))
      setLignes(importedLignes)

      // Import remise globale depuis le devis
      const devisData = devisAcceptes.find((d) => d.id === selectedDevisId) as (DevisWithClient & {
        remise_globale_type?: 'pct' | 'montant'
        remise_globale_pct?: number
        remise_globale_montant?: number
      }) | undefined
      if (devisData?.remise_globale_type) {
        setRemiseGlobaleType(devisData.remise_globale_type)
        setRemiseGlobaleValeur(
          devisData.remise_globale_type === 'montant'
            ? (devisData.remise_globale_montant || 0)
            : (devisData.remise_globale_pct || 0)
        )
        setRemiseGlobaleLibelle(devisData.remise_globale_libelle || '')
      }

      toast.success('Lignes importées depuis le devis')
    }
  }

  // Totals
  const produitLignes = lignes.filter((l) => l.type === 'produit')
  const totaux = calculerTotauxAvecRemiseGlobale(
    produitLignes.map((l) => ({ total_ht: l.total_ht, taux_tva: l.taux_tva })),
    remiseGlobaleType,
    remiseGlobaleValeur
  )

  const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0)
  const soldeRestant = Math.round((totaux.totalTTC - totalPaye) * 100) / 100

  // --- Auto-save logic ---
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    formValuesRef.current = {
      clientId, devisId, typeFacture, dateFacture, dateEcheance, mentionTva,
      conditionsPaiement, notesInternes, remiseGlobaleType, remiseGlobaleValeur,
      remiseGlobaleLibelle, lignes, piecesJointes, acomptePct,
    }
  })

  const handleAutoSave = useCallback(async () => {
    const v = formValuesRef.current as {
      clientId: string; devisId: string; typeFacture: string; dateFacture: string
      dateEcheance: string; mentionTva: string; conditionsPaiement: string; notesInternes: string
      remiseGlobaleType: 'pct' | 'montant'; remiseGlobaleValeur: number; remiseGlobaleLibelle: string
      lignes: LigneForm[]; piecesJointes: PieceJointe[]; acomptePct: number
    }
    if (!v.clientId) return

    setAutoSaveStatus('saving')

    const produitLignesCalc = v.lignes.filter((l) => l.type === 'produit')
    const totauxCalc = calculerTotauxAvecRemiseGlobale(
      produitLignesCalc.map((l) => ({ total_ht: l.total_ht, taux_tva: l.taux_tva })),
      v.remiseGlobaleType,
      v.remiseGlobaleValeur
    )

    const factureData = {
      client_id: v.clientId,
      devis_id: v.devisId || null,
      type: v.typeFacture,
      date_facture: v.dateFacture,
      date_echeance: v.dateEcheance || null,
      mention_tva: v.mentionTva || null,
      conditions_paiement: v.conditionsPaiement || null,
      notes_internes: v.notesInternes || null,
      total_ht: totauxCalc.totalHT,
      total_tva: totauxCalc.totalTVA,
      total_ttc: totauxCalc.totalTTC,
      solde_ttc: totauxCalc.totalTTC,
      remise_globale_type: v.remiseGlobaleType,
      remise_globale_pct: v.remiseGlobaleType === 'pct' ? v.remiseGlobaleValeur : 0,
      remise_globale_montant: v.remiseGlobaleType === 'montant' ? v.remiseGlobaleValeur : 0,
      remise_globale_libelle: v.remiseGlobaleLibelle || null,
      pieces_jointes: v.piecesJointes.length > 0 ? v.piecesJointes : [],
      acompte_pct: v.typeFacture === 'acompte' ? (v.acomptePct || null) : null,
    }

    try {
      let targetId = autoSaveIdRef.current

      if (targetId) {
        const { error } = await supabase.from('factures').update(factureData).eq('id', targetId)
        if (error) throw error
        await supabase.from('factures_lignes').delete().eq('facture_id', targetId)
      } else {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData.user) throw new Error('Non authentifié')
        const { data: utilisateur } = await supabase
          .from('utilisateurs').select('entreprise_id').eq('id', authData.user.id).single()
        if (!utilisateur) throw new Error('Utilisateur non trouvé')
        const { data: entrepriseData } = await supabase
          .from('entreprises').select('prefixe_facture, prefixe_avoir').eq('id', utilisateur.entreprise_id).single()
        const prefix = v.typeFacture === 'avoir'
          ? (entrepriseData?.prefixe_avoir || 'AVO')
          : (entrepriseData?.prefixe_facture || 'FAC')
        const { data: numResult } = await supabase.rpc('generate_numero', {
          p_type: prefix,
          p_entreprise_id: utilisateur.entreprise_id,
        })
        const { data: newFacture, error } = await supabase
          .from('factures')
          .insert({ ...factureData, entreprise_id: utilisateur.entreprise_id, numero: numResult as string })
          .select().single()
        if (error) throw error
        targetId = newFacture.id
        autoSaveIdRef.current = targetId
        if (v.devisId) {
          await supabase.from('devis').update({ statut: 'converti' }).eq('id', v.devisId)
        }
        window.history.replaceState(null, '', `/factures/${targetId}`)
      }

      if (v.lignes.length > 0 && targetId) {
        const lignesData = v.lignes.map((l, i) => ({
          facture_id: targetId,
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
        }))
        const { error: lignesError } = await supabase.from('factures_lignes').insert(lignesData)
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
    if (isFactureReadOnly) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(handleAutoSave, 3000)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, devisId, typeFacture, dateFacture, dateEcheance, mentionTva,
      conditionsPaiement, notesInternes, remiseGlobaleType, remiseGlobaleValeur,
      remiseGlobaleLibelle, lignes, piecesJointes, acomptePct])

  // Save
  const handleSave = async () => {
    if (!clientId) {
      toast.error('Veuillez sélectionner un client')
      return
    }
    if (lignes.length === 0) {
      toast.error('Ajoutez au moins une ligne à la facture')
      return
    }

    // Cancel any pending auto-save to avoid race condition
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }

    setSaving(true)

    try {
      const factureData = {
        client_id: clientId,
        devis_id: devisId || null,
        type: typeFacture,
        date_facture: dateFacture,
        date_echeance: dateEcheance || null,
        mention_tva: mentionTva || null,
        conditions_paiement: conditionsPaiement || null,
        notes_internes: notesInternes || null,
        total_ht: totaux.totalHT,
        total_tva: totaux.totalTVA,
        total_ttc: totaux.totalTTC,
        solde_ttc: totaux.totalTTC,
        remise_globale_type: remiseGlobaleType,
        remise_globale_pct: remiseGlobaleType === 'pct' ? remiseGlobaleValeur : 0,
        remise_globale_montant: remiseGlobaleType === 'montant' ? remiseGlobaleValeur : 0,
        remise_globale_libelle: remiseGlobaleLibelle || null,
        pieces_jointes: piecesJointes.length > 0 ? piecesJointes : [],
        acompte_pct: typeFacture === 'acompte' ? (acomptePct || null) : null,
      }

      // Use auto-saved ID if available
      let factureId = facture?.id || autoSaveIdRef.current

      if (factureId) {
        const { error } = await supabase
          .from('factures')
          .update(factureData)
          .eq('id', factureId)
        if (error) throw error

        // Delete existing lines then re-insert
        await supabase.from('factures_lignes').delete().eq('facture_id', factureId)
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

        // Fetch custom prefixes from entreprise settings
        const { data: entrepriseData } = await supabase
          .from('entreprises')
          .select('prefixe_facture, prefixe_avoir')
          .eq('id', utilisateur.entreprise_id)
          .single()

        // Generate numero via PostgreSQL function
        const prefix = typeFacture === 'avoir'
          ? (entrepriseData?.prefixe_avoir || 'AVO')
          : (entrepriseData?.prefixe_facture || 'FAC')
        const { data: numResult } = await supabase.rpc('generate_numero', {
          p_type: prefix,
          p_entreprise_id: utilisateur.entreprise_id,
        })

        const { data: newFacture, error } = await supabase
          .from('factures')
          .insert({
            ...factureData,
            entreprise_id: utilisateur.entreprise_id,
            numero: numResult as string,
          })
          .select()
          .single()
        if (error) throw error
        factureId = newFacture.id

        // If linked to a devis, mark as converti
        if (devisId) {
          await supabase
            .from('devis')
            .update({ statut: 'converti' })
            .eq('id', devisId)
        }
      }

      // Insert all lines
      const lignesData = lignes.map((l, i) => ({
        facture_id: factureId!,
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
      }))

      const { error: lignesError } = await supabase
        .from('factures_lignes')
        .insert(lignesData)
      if (lignesError) throw lignesError

      // Acquittement : marquer payée + créer le paiement
      if (acquittee && factureId) {
        const { data: authData } = await supabase.auth.getUser()
        const { data: utilisateur } = await supabase
          .from('utilisateurs').select('entreprise_id').eq('id', authData.user!.id).single()
        await supabase.from('factures').update({ statut: 'payee', solde_ttc: 0 }).eq('id', factureId)
        // Supprimer anciens paiements pour éviter doublons sur re-save
        await supabase.from('paiements_clients').delete().eq('facture_id', factureId)
        await supabase.from('paiements_clients').insert({
          entreprise_id: utilisateur!.entreprise_id,
          facture_id: factureId,
          date_paiement: dateFacture,
          montant: totaux.totalTTC,
          mode: modePaiementAcquittee,
        })
      }

      toast.success(
        isEdit
          ? 'Facture modifiée avec succès'
          : acquittee ? 'Facture créée et marquée acquittée' : 'Facture créée avec succès'
      )
      router.push('/factures')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde')
    }

    setSaving(false)
  }

  const refreshPaiements = async () => {
    if (!facture?.id) return
    const { data } = await supabase
      .from('paiements_clients')
      .select('*')
      .eq('facture_id', facture.id)
      .order('date_paiement', { ascending: false })
    if (data) setPaiements(data)
  }

  // Send facture
  const handleEnvoyer = async () => {
    if (!facture) return
    setSending(true)
    try {
      const res = await fetch(`/api/factures/${facture.id}/envoyer`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'envoi")
      } else if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success('Facture envoyée avec succès !')
        router.push('/factures')
        router.refresh()
      }
    } catch {
      toast.error("Erreur lors de l'envoi de la facture")
      router.refresh()
    }
    setSending(false)
    setConfirmSend(false)
  }

  const clientDisplayName = (c: Client) => {
    if (c.type === 'professionnel' && c.raison_sociale) return c.raison_sociale
    return [c.prenom, c.nom].filter(Boolean).join(' ') || '\u2014'
  }

  const clientOptions = localClients.map((c) => ({
    value: c.id,
    label: clientDisplayName(c),
    sublabel: c.email || c.telephone || undefined,
  }))

  const devisOptions = devisAcceptes.map((d) => ({
    value: d.id,
    label: d.numero,
    sublabel: `${d.client ? (d.client.type === 'professionnel' && d.client.raison_sociale ? d.client.raison_sociale : [d.client.prenom, d.client.nom].filter(Boolean).join(' ')) : ''} — ${formatMontant(d.total_ttc)}`,
  }))

  const getDevisLabel = (d: DevisWithClient) => {
    const clientName = d.client
      ? d.client.type === 'professionnel' && d.client.raison_sociale
        ? d.client.raison_sociale
        : [d.client.prenom, d.client.nom].filter(Boolean).join(' ')
      : ''
    return `${d.numero} - ${clientName} - ${formatMontant(d.total_ttc)}`
  }

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
      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type de facture</Label>
            <select
              value={typeFacture}
              onChange={(e) => setTypeFacture(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {typeFactureOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Client *</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchSelect
                  options={clientOptions}
                  value={clientId}
                  onChange={setClientId}
                  placeholder="Rechercher un client..."
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowNewClientDialog(true)}
                title="Ajouter un nouveau client"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Importer depuis un devis (optionnel)</Label>
            <SearchSelect
              options={devisOptions}
              value={devisId}
              onChange={handleDevisSelect}
              placeholder="Rechercher un devis..."
            />
          </div>
          <div className="space-y-2">
            <Label>Date de facture</Label>
            <Input
              type="date"
              value={dateFacture}
              onChange={(e) => setDateFacture(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Date d&apos;échéance</Label>
            <Input
              type="date"
              value={dateEcheance}
              onChange={(e) => setDateEcheance(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Conditions de paiement</Label>
            <Input
              value={conditionsPaiement}
              onChange={(e) => setConditionsPaiement(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mention TVA</Label>
            <Input
              value={mentionTva}
              onChange={(e) => setMentionTva(e.target.value)}
              placeholder="Ex: Autoliquidation art. 20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration acompte */}
      {typeFacture === 'acompte' && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-base">Configuration de l&apos;acompte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="space-y-2">
                <Label>Pourcentage d&apos;acompte</Label>
                <div className="flex items-center gap-2">
                  <NumericInput
                    value={acomptePct}
                    onChange={setAcomptePct}
                    placeholder="Ex: 30"
                    className="w-28"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              {devisTotalTTC > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Montant de l&apos;acompte</span>
                  <span className="text-lg font-bold text-orange-700">
                    = {formatMontant(Math.round(devisTotalTTC * acomptePct / 100 * 100) / 100)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">TTC</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Reste à facturer :{' '}
                    <span className="font-medium text-foreground">
                      {formatMontant(Math.round(devisTotalTTC * (1 - acomptePct / 100) * 100) / 100)}
                    </span>
                    {' '}sur un total devis de {formatMontant(devisTotalTTC)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    TVA appliquée : <span className="font-medium text-foreground">{devisAvgTva}%</span>
                    {devisAvgTva !== 21 && <span className="text-orange-600 ml-1">(taux du devis)</span>}
                  </span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => {
                  const base = devisTotalTTC > 0 ? devisTotalTTC : totaux.totalTTC
                  if (!base && !devisId) return
                  const tva = devisAvgTva
                  const montantTTC = Math.round(base * acomptePct / 100 * 100) / 100
                  const montantHT = Math.round(montantTTC / (1 + tva / 100) * 100) / 100
                  const label = devisId
                    ? `Acompte ${acomptePct}% sur devis`
                    : `Acompte ${acomptePct}% sur travaux`
                  setLignes([{
                    type: 'produit',
                    produit_id: null,
                    designation: label,
                    description: '',
                    quantite: 1,
                    unite: 'forfait',
                    prix_unitaire_ht: montantHT,
                    remise_type: 'pct',
                    remise_pct: 0,
                    remise_montant: 0,
                    taux_tva: tva,
                    total_ht: montantHT,
                    _uid: genFactureLigneUid(),
                  }])
                }}
              >
                Générer la ligne automatiquement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lignes de la facture */}
      <Card>
        <CardHeader>
          <CardTitle>Lignes de la facture</CardTitle>
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
              <div className="hidden md:grid md:grid-cols-8 gap-2 px-3 pl-10 text-xs text-muted-foreground font-medium">
                <div className="col-span-2">Désignation</div>
                <div>Qté</div>
                <div>Unité</div>
                <div>PU HT</div>
                <div>Remise</div>
                <div>TVA</div>
                <div className="text-right">Total HT</div>
              </div>
              {lignes.map((ligne, index) => (
                <SortableLigneItem key={ligne._uid ?? String(index)} id={ligne._uid ?? String(index)}>
                  {(dragHandleProps) => (
                <div className="border rounded-lg p-3">
                  {ligne.type === 'section' ? (
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
                            if (e.key === 'Enter') { e.preventDefault(); addLigne('produit') }
                          }}
                          className="font-semibold"
                          placeholder="Titre de la section"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLigne(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : ligne.type === 'texte' ? (
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-2 shrink-0 cursor-grab" {...dragHandleProps} />
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
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLigne(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" {...dragHandleProps} />
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
                          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLigne(index)}
                          className="ml-auto"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
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
                              if (e.key === 'Enter') { e.preventDefault(); addLigne('produit') }
                            }}
                            placeholder="Désignation"
                          />
                        </div>
                        <div>
                          <NumericInput
                            value={ligne.quantite}
                            onChange={(v) => updateLigne(index, { quantite: v })}
                            placeholder="Qté"
                          />
                        </div>
                        <div>
                          <select
                            value={ligne.unite}
                            onChange={(e) => updateLigne(index, { unite: e.target.value })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs"
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
                          />
                        </div>
                        <div className="flex gap-1">
                          <NumericInput
                            value={ligne.remise_type === 'montant' ? ligne.remise_montant : ligne.remise_pct}
                            onChange={(v) => updateLigne(index, ligne.remise_type === 'montant' ? { remise_montant: v } : { remise_pct: v })}
                            placeholder={ligne.remise_type === 'pct' ? 'Remise %' : 'Remise €'}
                            className="min-w-0"
                          />
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
                        </div>
                        <div>
                          <select
                            value={ligne.taux_tva}
                            onChange={(e) =>
                              updateLigne(index, { taux_tva: parseFloat(e.target.value) })
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs"
                          >
                            <option value={0}>0%</option>
                            <option value={6}>6%</option>
                            <option value={12}>12%</option>
                            <option value={21}>21%</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-end font-mono text-sm font-medium">
                          {formatMontant(ligne.total_ht)}
                        </div>
                      </div>
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
                        />
                      </div>
                    </div>
                  )}
                </div>
                  )}
                </SortableLigneItem>
              ))}
            </div>
              </SortableContext>
            </DndContext>
          )}
          {lignes.length > 0 && (
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
            {/* Remise globale */}
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
              <span className="font-mono font-bold text-lg">
                {formatMontant(totaux.totalTTC)}
              </span>
            </div>
            {isEdit && paiements.length > 0 && (
              <>
                <Separator className="w-64" />
                <div className="flex justify-between w-64">
                  <span className="text-muted-foreground">Déjà payé</span>
                  <span className="font-mono text-green-600">
                    - {formatMontant(totalPaye)}
                  </span>
                </div>
                <div className="flex justify-between w-64">
                  <span className="font-semibold">Solde restant</span>
                  <span className="font-mono font-bold text-lg">
                    {formatMontant(soldeRestant)}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paiements (edit mode only) */}
      {isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Paiements</CardTitle>
            <CardAction>
              <Button
                type="button"
                size="sm"
                className="bg-[#141414] hover:bg-[#141414]/90"
                onClick={() => setPaiementDialogOpen(true)}
                disabled={facture.statut === 'payee'}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Ajouter un paiement
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {paiements.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucun paiement enregistré
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead className="hidden md:table-cell">Mode</TableHead>
                      <TableHead className="hidden md:table-cell">Référence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paiements.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.date_paiement)}</TableCell>
                        <TableCell className="font-mono">
                          {formatMontant(p.montant)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge className="bg-gray-100 text-gray-800">
                            {modesPaiementLabels[p.mode] || p.mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {p.reference_bancaire || '\u2014'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment link section (edit mode only) */}
      {isEdit && facture && (
        <PaymentLinkSection
          factureId={facture.id}
          factureStatut={facture.statut}
          paymentSessions={paymentSessions || []}
          paymentEnabled={paymentEnabled || false}
        />
      )}

      {/* Notes internes */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Notes internes (non visibles sur le PDF)</Label>
            <Textarea
              value={notesInternes}
              onChange={(e) => setNotesInternes(e.target.value)}
              rows={2}
              placeholder="Notes pour usage interne uniquement..."
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
            docType="factures"
          />
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pb-6">
        {/* Indicateur auto-save */}
        {!isFactureReadOnly && autoSaveStatus !== 'idle' && (
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
          onClick={() => router.push('/factures')}
        >
          Annuler
        </Button>
        {isEdit && facture && facture.statut !== 'payee' && (
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
            {facture.statut === 'brouillon' ? 'Envoyer au client' : 'Renvoyer au client'}
          </Button>
        )}
        {!isEdit && (
          <div className="flex items-center gap-3 mr-auto">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acquittee}
                onChange={e => setAcquittee(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
              <span className="text-sm font-medium text-[#374151]">Facture acquittée</span>
            </label>
            {acquittee && (
              <select
                value={modePaiementAcquittee}
                onChange={e => setModePaiementAcquittee(e.target.value as typeof modePaiementAcquittee)}
                className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-sm text-[#374151] focus:outline-none focus:border-emerald-500"
              >
                <option value="virement">Virement</option>
                <option value="cash">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="carte">Carte</option>
                <option value="autre">Autre</option>
              </select>
            )}
          </div>
        )}
        <Button
          onClick={handleSave}
          className={acquittee && !isEdit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#141414] hover:bg-[#141414]/90'}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEdit ? 'Enregistrer les modifications' : acquittee ? 'Créer et acquitter' : 'Créer la facture'}
        </Button>
      </div>

      {/* Paiement Dialog */}
      {isEdit && facture && (
        <PaiementDialog
          open={paiementDialogOpen}
          onOpenChange={setPaiementDialogOpen}
          factureId={facture.id}
          entrepriseId={facture.entreprise_id}
          soldeTTC={soldeRestant > 0 ? soldeRestant : 0}
          onSuccess={refreshPaiements}
        />
      )}

      {/* Send confirmation dialog */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              La facture sera envoyée par email au client avec un PDF en pièce
              jointe. Le statut passera à « Envoyée ».
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
