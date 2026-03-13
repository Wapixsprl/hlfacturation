'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { produitSchema, type ProduitFormData } from '@/lib/validations/produit'
import type { Produit } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  produit: Produit | null
  onSuccess: () => void
}

const categories = [
  { value: 'materiaux', label: 'Matériaux' },
  { value: 'main_oeuvre', label: "Main d'œuvre" },
  { value: 'sous_traitance', label: 'Sous-traitance' },
  { value: 'equipement', label: 'Équipement' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'autre', label: 'Autre' },
]

const unites = [
  { value: 'piece', label: 'Pièce' },
  { value: 'h', label: 'Heure (h)' },
  { value: 'j', label: 'Jour (j)' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'm2', label: 'm²' },
  { value: 'm3', label: 'm³' },
  { value: 'ml', label: 'ml' },
  { value: 'lot', label: 'Lot' },
  { value: 'kg', label: 'kg' },
  { value: 'l', label: 'Litre' },
  { value: 'autre', label: 'Autre' },
]

export function ProduitDialog({ open, onOpenChange, produit, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const isEdit = !!produit

  const form = useForm<ProduitFormData>({
    resolver: zodResolver(produitSchema) as unknown as Resolver<ProduitFormData>,
    defaultValues: {
      reference: '',
      designation: '',
      description: '',
      categorie: 'materiaux',
      prix_ht: 0,
      prix_achat_ht: undefined,
      taux_tva: 21,
      unite: 'piece',
    },
  })

  useEffect(() => {
    if (open) {
      if (produit) {
        form.reset({
          reference: produit.reference || '',
          designation: produit.designation,
          description: produit.description || '',
          categorie: produit.categorie,
          prix_ht: produit.prix_ht,
          prix_achat_ht: produit.prix_achat_ht ?? undefined,
          taux_tva: produit.taux_tva,
          unite: produit.unite,
        })
      } else {
        form.reset({
          reference: '',
          designation: '',
          description: '',
          categorie: 'materiaux',
          prix_ht: 0,
          prix_achat_ht: undefined,
          taux_tva: 21,
          unite: 'piece',
        })
      }
    }
  }, [open, produit, form])

  const onSubmit = async (data: ProduitFormData) => {
    setLoading(true)

    if (isEdit) {
      const { error } = await supabase.from('produits').update(data).eq('id', produit.id)
      if (error) { toast.error('Erreur lors de la modification'); setLoading(false); return }
      toast.success('Produit modifié')
    } else {
      const { data: user } = await supabase.auth.getUser()
      const { data: utilisateur } = await supabase
        .from('utilisateurs')
        .select('entreprise_id')
        .eq('id', user.user!.id)
        .single()

      const { error } = await supabase
        .from('produits')
        .insert({ ...data, entreprise_id: utilisateur!.entreprise_id })
      if (error) { toast.error('Erreur lors de la création'); setLoading(false); return }
      toast.success('Produit créé')
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold text-[#141414]">{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input {...form.register('reference')} placeholder="REF-001" />
            </div>
            <div className="space-y-2">
              <Label>Désignation *</Label>
              <Input {...form.register('designation')} />
              {form.formState.errors.designation && (
                <p className="text-[12px] text-[#DC2626]">{form.formState.errors.designation.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register('description')} rows={2} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <select
                {...form.register('categorie')}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1.5 text-sm transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Unité</Label>
              <select
                {...form.register('unite')}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1.5 text-sm transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {unites.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Prix HT *</Label>
              <Input type="number" step="0.01" {...form.register('prix_ht')} />
              {form.formState.errors.prix_ht && (
                <p className="text-[12px] text-[#DC2626]">{form.formState.errors.prix_ht.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Prix achat HT</Label>
              <Input type="number" step="0.01" {...form.register('prix_achat_ht')} />
            </div>
            <div className="space-y-2">
              <Label>TVA %</Label>
              <select
                {...form.register('taux_tva', { valueAsNumber: true })}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1.5 text-sm transition-all duration-150 ease-[cubic-bezier(0,0,0.2,1)] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value={6}>6%</option>
                <option value={12}>12%</option>
                <option value={21}>21%</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" className="bg-[#141414] hover:bg-[#141414]/90" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEdit ? 'Enregistrer' : 'Créer le produit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
