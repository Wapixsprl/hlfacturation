'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  factureAchatSchema,
  type FactureAchatFormData,
} from '@/lib/validations/facture-achat'
import type {
  FactureAchat,
  EcheanceFournisseur,
  Fournisseur,
} from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { formatMontant } from '@/lib/utils'
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
} from '@/components/ui/card'
// Native <select> instead of shadcn Select — base-ui Select.Value shows UUID instead of label
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Save, Loader2, Plus, Trash2, ArrowLeft, Upload, FileText, X } from 'lucide-react'
import Link from 'next/link'
import { SearchSelect } from '@/components/shared/SearchSelect'

interface DevisOption {
  clients?: { nom: string | null; prenom: string | null; raison_sociale: string | null } | { nom: string | null; prenom: string | null; raison_sociale: string | null }[]
  id: string
  numero: string
  titre: string | null
  client_id: string
}

interface Props {
  factureAchat?: FactureAchat
  initialEcheances?: EcheanceFournisseur[]
  fournisseurs: Fournisseur[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  devisList: DevisOption[] | any[]
}

const CATEGORIE_OPTIONS = [
  { value: 'materiaux', label: 'Matériaux' },
  { value: 'sous_traitance', label: 'Sous-traitance' },
  { value: 'carburant', label: 'Carburant' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'outillage', label: 'Outillage' },
  { value: 'telecom', label: 'Télécom' },
  { value: 'autre', label: 'Autre' },
] as const

const TVA_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 6, label: '6%' },
  { value: 12, label: '12%' },
  { value: 21, label: '21%' },
] as const

const STATUT_ECHEANCE_OPTIONS = [
  { value: 'a_payer', label: 'A payer' },
  { value: 'paye', label: 'Payé' },
  { value: 'en_retard', label: 'En retard' },
] as const

export function FactureAchatForm({
  factureAchat,
  initialEcheances,
  fournisseurs,
  devisList,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { utilisateur } = useUser()
  const isEdit = !!factureAchat
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    factureAchat?.fichier_url ? factureAchat.fichier_url.split('/').pop()?.replace(/^\d+_/, '') || 'Fichier' : null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Track which field the user is currently editing to decide calculation direction
  const lastEditedRef = useRef<'ht' | 'ttc' | 'tva_rate' | null>(null)

  const defaultEcheances = (initialEcheances || []).map((e) => ({
    id: e.id,
    date_echeance: e.date_echeance,
    montant: e.montant,
    statut: e.statut,
    date_paiement: e.date_paiement,
    mode_paiement: e.mode_paiement,
    notes: e.notes,
  }))

  // Compute initial taux_tva from existing data
  const initialTauxTva = factureAchat && factureAchat.total_ht > 0
    ? Math.round((factureAchat.total_tva / factureAchat.total_ht) * 100)
    : 21

  const form = useForm<FactureAchatFormData>({
    resolver: zodResolver(factureAchatSchema) as unknown as Resolver<FactureAchatFormData>,
    defaultValues: {
      fournisseur_id: factureAchat?.fournisseur_id || '',
      numero_fournisseur: factureAchat?.numero_fournisseur || '',
      date_facture: factureAchat?.date_facture || new Date().toISOString().split('T')[0],
      designation: factureAchat?.designation || '',
      categorie: factureAchat?.categorie || 'autre',
      devis_id: factureAchat?.devis_id || '',
      taux_tva: initialTauxTva,
      total_ht: factureAchat?.total_ht || 0,
      total_tva: factureAchat?.total_tva || 0,
      total_ttc: factureAchat?.total_ttc || 0,
      fichier_url: factureAchat?.fichier_url || '',
      notes: factureAchat?.notes || '',
      echeances: defaultEcheances,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'echeances',
  })

  const watchHT = form.watch('total_ht')
  const watchTTC = form.watch('total_ttc')
  const watchTauxTva = form.watch('taux_tva')

  // Bidirectional calculation: user enters HT -> calculates TVA + TTC, or enters TTC -> calculates HT + TVA
  useEffect(() => {
    const round = (n: number) => Math.round(n * 100) / 100

    if (lastEditedRef.current === 'ht' || lastEditedRef.current === 'tva_rate') {
      const ht = Number(watchHT) || 0
      const taux = Number(watchTauxTva) || 0
      const tva = round(ht * taux / 100)
      const ttc = round(ht + tva)
      if (Math.abs(ttc - (form.getValues('total_ttc') || 0)) > 0.001) {
        form.setValue('total_tva', tva)
        form.setValue('total_ttc', ttc)
      }
    } else if (lastEditedRef.current === 'ttc') {
      const ttc = Number(watchTTC) || 0
      const taux = Number(watchTauxTva) || 0
      const ht = round(ttc / (1 + taux / 100))
      const tva = round(ttc - ht)
      if (Math.abs(ht - (form.getValues('total_ht') || 0)) > 0.001) {
        form.setValue('total_ht', ht)
        form.setValue('total_tva', tva)
      }
    }
  }, [watchHT, watchTTC, watchTauxTva, form])

  const addEcheance = () => {
    append({
      date_echeance: '',
      montant: 0,
      statut: 'a_payer',
      date_paiement: null,
      mode_paiement: null,
      notes: null,
    })
  }

  // File upload handler
  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/factures-achat/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'upload")
        return
      }
      // Store the storage path (not the signed URL) so it persists
      form.setValue('fichier_url', data.file_path)
      setUploadedFileName(file.name)
      toast.success('Fichier uploadé')
    } catch {
      toast.error("Erreur lors de l'upload du fichier")
    } finally {
      setUploading(false)
    }
  }

  const handleFileRemove = async () => {
    const currentPath = form.getValues('fichier_url')
    if (currentPath && currentPath.includes('/')) {
      // It's a storage path, delete from storage
      try {
        await fetch('/api/factures-achat/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: currentPath }),
        })
      } catch {
        // Ignore deletion errors (file may not exist)
      }
    }
    form.setValue('fichier_url', '')
    setUploadedFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onSubmit = async (data: FactureAchatFormData) => {
    if (!utilisateur) {
      toast.error('Utilisateur non identifié')
      return
    }

    setSaving(true)

    try {
      const factureData = {
        entreprise_id: utilisateur.entreprise_id,
        fournisseur_id: data.fournisseur_id,
        numero_fournisseur: data.numero_fournisseur || null,
        date_facture: data.date_facture,
        designation: data.designation || null,
        categorie: data.categorie,
        devis_id: data.devis_id || null,
        total_ht: data.total_ht,
        total_tva: data.total_tva,
        total_ttc: data.total_ttc,
        fichier_url: data.fichier_url || null,
        notes: data.notes || null,
      }

      let factureId: string

      if (isEdit && factureAchat) {
        const { error } = await supabase
          .from('factures_achat')
          .update(factureData)
          .eq('id', factureAchat.id)
        if (error) throw error
        factureId = factureAchat.id

        // Delete existing echeances and reinsert
        const { error: deleteError } = await supabase
          .from('echeances_fournisseurs')
          .delete()
          .eq('facture_achat_id', factureId)
        if (deleteError) throw deleteError
      } else {
        const { data: inserted, error } = await supabase
          .from('factures_achat')
          .insert(factureData)
          .select('id')
          .single()
        if (error) throw error
        factureId = inserted.id
      }

      // Insert echeances
      if (data.echeances.length > 0) {
        const echeancesData = data.echeances.map((e) => ({
          facture_achat_id: factureId,
          date_echeance: e.date_echeance,
          montant: e.montant,
          statut: e.statut,
          date_paiement: e.date_paiement || null,
          mode_paiement: e.mode_paiement || null,
          notes: e.notes || null,
        }))
        const { error: ecError } = await supabase
          .from('echeances_fournisseurs')
          .insert(echeancesData)
        if (ecError) throw ecError
      }

      toast.success(isEdit ? 'Facture mise à jour' : 'Facture créée')
      router.push('/factures-achat')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const totalEcheances = fields.reduce((sum, _, index) => {
    return sum + (Number(form.watch(`echeances.${index}.montant`)) || 0)
  }, 0)

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Back link */}
      <Link
        href="/factures-achat"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-[#141414]"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Retour aux factures d&apos;achat
      </Link>

      {/* Main info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fournisseur */}
            <div className="space-y-2">
              <Label htmlFor="fournisseur_id">
                Fournisseur <span className="text-red-500">*</span>
              </Label>
              <SearchSelect
                options={fournisseurs.map((f) => ({
                  value: f.id,
                  label: f.raison_sociale,
                  sublabel: f.email || f.telephone || undefined,
                }))}
                value={form.watch('fournisseur_id')}
                onChange={(val) => form.setValue('fournisseur_id', val, { shouldValidate: true })}
                placeholder="Rechercher un fournisseur..."
              />
              {form.formState.errors.fournisseur_id && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.fournisseur_id.message}
                </p>
              )}
            </div>

            {/* N° Fournisseur */}
            <div className="space-y-2">
              <Label htmlFor="numero_fournisseur">N° facture fournisseur</Label>
              <Input
                id="numero_fournisseur"
                {...form.register('numero_fournisseur')}
                placeholder="Ex: FA-2026-001"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date_facture">
                Date de facture <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date_facture"
                type="date"
                {...form.register('date_facture')}
              />
              {form.formState.errors.date_facture && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.date_facture.message}
                </p>
              )}
            </div>

            {/* Catégorie */}
            <div className="space-y-2">
              <Label htmlFor="categorie">
                Catégorie <span className="text-red-500">*</span>
              </Label>
              <select
                id="categorie"
                value={form.watch('categorie')}
                onChange={(e) => form.setValue('categorie', e.target.value as FactureAchatFormData['categorie'], { shouldValidate: true })}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CATEGORIE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Designation */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="designation">Désignation / description</Label>
              <Input
                id="designation"
                {...form.register('designation')}
                placeholder="Description de l'achat..."
              />
            </div>

            {/* Devis lié */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="devis_id">Devis / chantier lié (optionnel)</Label>
              <select
                id="devis_id"
                value={form.watch('devis_id') || ''}
                onChange={(e) => form.setValue('devis_id', e.target.value)}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Aucun devis lié</option>
                {devisList.map((d: DevisOption) => (
                  <option key={d.id} value={d.id}>
                    {d.numero} {d.titre ? `- ${d.titre}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Montants */}
      <Card>
        <CardHeader>
          <CardTitle>Montants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-2">
            Saisissez le montant HT ou TTC et le taux de TVA. Les autres champs se calculent automatiquement.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_ht">Montant HT</Label>
              <Input
                id="total_ht"
                type="number"
                step="0.01"
                min="0"
                {...form.register('total_ht', { valueAsNumber: true })}
                onFocus={() => { lastEditedRef.current = 'ht' }}
                onChange={(e) => {
                  lastEditedRef.current = 'ht'
                  form.setValue('total_ht', parseFloat(e.target.value) || 0)
                }}
              />
              {form.formState.errors.total_ht && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.total_ht.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taux_tva">Taux TVA</Label>
              <select
                id="taux_tva"
                value={form.watch('taux_tva')}
                onChange={(e) => {
                  lastEditedRef.current = 'tva_rate'
                  form.setValue('taux_tva', Number(e.target.value))
                }}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {TVA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_tva">Montant TVA</Label>
              <div className="relative">
                <Input
                  id="total_tva"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.watch('total_tva')}
                  className="bg-gray-50"
                  readOnly
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  auto
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_ttc">Montant TTC</Label>
              <Input
                id="total_ttc"
                type="number"
                step="0.01"
                min="0"
                {...form.register('total_ttc', { valueAsNumber: true })}
                onFocus={() => { lastEditedRef.current = 'ttc' }}
                onChange={(e) => {
                  lastEditedRef.current = 'ttc'
                  form.setValue('total_ttc', parseFloat(e.target.value) || 0)
                }}
              />
              {form.formState.errors.total_ttc && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.total_ttc.message}
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-right">
            <span className="text-lg font-semibold text-[#141414]">
              Total TTC : {formatMontant(form.watch('total_ttc') || 0)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Echéances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Échéances de paiement</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEcheance}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune échéance définie. Cliquez sur &quot;Ajouter&quot; pour en créer une.
            </p>
          ) : (
            <>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#141414]">
                      Échéance {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Date d&apos;échéance</Label>
                      <Input
                        type="date"
                        {...form.register(`echeances.${index}.date_echeance`)}
                      />
                      {form.formState.errors.echeances?.[index]?.date_echeance && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.echeances[index]?.date_echeance?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Montant</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(`echeances.${index}.montant`, {
                          valueAsNumber: true,
                        })}
                      />
                      {form.formState.errors.echeances?.[index]?.montant && (
                        <p className="text-xs text-red-500">
                          {form.formState.errors.echeances[index]?.montant?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Statut</Label>
                      <select
                        value={form.watch(`echeances.${index}.statut`)}
                        onChange={(e) => form.setValue(`echeances.${index}.statut`, e.target.value as 'a_payer' | 'paye' | 'en_retard')}
                        className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {STATUT_ECHEANCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total des échéances :
                </span>
                <Badge
                  className={
                    Math.abs(totalEcheances - (form.watch('total_ttc') || 0)) < 0.01
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }
                >
                  {formatMontant(totalEcheances)}
                  {Math.abs(totalEcheances - (form.watch('total_ttc') || 0)) >= 0.01 && (
                    <span className="ml-1">
                      (diff: {formatMontant(totalEcheances - (form.watch('total_ttc') || 0))})
                    </span>
                  )}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notes & fichier */}
      <Card>
        <CardHeader>
          <CardTitle>Informations complémentaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fichier justificatif (PDF, image)</Label>
            {uploadedFileName || form.watch('fichier_url') ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <FileText className="h-5 w-5 text-[#6B7280] shrink-0" />
                <span className="flex-1 text-sm text-[#111827] truncate">
                  {uploadedFileName || form.watch('fichier_url')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFileRemove}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 cursor-pointer hover:border-[#17C2D7] hover:bg-[#F0FDFD] transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF] mb-2" />
                ) : (
                  <Upload className="h-8 w-8 text-[#9CA3AF] mb-2" />
                )}
                <p className="text-sm text-[#6B7280]">
                  {uploading
                    ? 'Upload en cours...'
                    : 'Cliquez ou glissez un fichier ici'}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  PDF, PNG, JPG — max 10 MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Notes internes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Link href="/factures-achat">
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={saving}
          className="bg-[#141414] hover:bg-[#141414]/90"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isEdit ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
