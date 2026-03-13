'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Facture, FactureLigne, Client, Produit, Devis, PaiementClient } from '@/types/database'
import { calculerLigne, calculerTotaux, formatMontant, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Trash2, Save, Loader2, GripVertical, CreditCard, Send } from 'lucide-react'
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
import type { PaymentSession } from '@/types/database'

interface LigneForm {
  id?: string
  type: 'produit' | 'texte' | 'section'
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
  clients,
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

    if (devisLignes && devisLignes.length > 0) {
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
          remise_pct: l.remise_pct,
          taux_tva: l.taux_tva,
          total_ht: l.total_ht,
        }))
      setLignes(importedLignes)
      toast.success('Lignes importées depuis le devis')
    }
  }

  // Totals
  const produitLignes = lignes.filter((l) => l.type === 'produit')
  const totaux = calculerTotaux(
    produitLignes.map((l) => ({
      total_ht: l.total_ht,
      taux_tva: l.taux_tva,
    }))
  )

  const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0)
  const soldeRestant = Math.round((totaux.totalTTC - totalPaye) * 100) / 100

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
      }

      let factureId = facture?.id

      if (isEdit) {
        const { error } = await supabase
          .from('factures')
          .update(factureData)
          .eq('id', factureId!)
        if (error) throw error

        // Delete existing lines then re-insert
        await supabase.from('factures_lignes').delete().eq('facture_id', factureId!)
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
        remise_pct: l.remise_pct,
        taux_tva: l.taux_tva,
        total_ht: l.total_ht,
      }))

      const { error: lignesError } = await supabase
        .from('factures_lignes')
        .insert(lignesData)
      if (lignesError) throw lignesError

      toast.success(
        isEdit
          ? 'Facture modifiée avec succès'
          : 'Facture créée avec succès'
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
    }
    setSending(false)
    setConfirmSend(false)
  }

  const clientDisplayName = (c: Client) => {
    if (c.type === 'professionnel' && c.raison_sociale) return c.raison_sociale
    return [c.prenom, c.nom].filter(Boolean).join(' ') || '\u2014'
  }

  const clientOptions = clients.map((c) => ({
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
            <SearchSelect
              options={clientOptions}
              value={clientId}
              onChange={setClientId}
              placeholder="Rechercher un client..."
            />
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
            <div className="space-y-3">
              {lignes.map((ligne, index) => (
                <div key={index} className="border rounded-lg p-3">
                  {ligne.type === 'section' ? (
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
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
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
                          />
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

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pb-6">
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
          {isEdit ? 'Enregistrer les modifications' : 'Créer la facture'}
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
    </div>
  )
}
