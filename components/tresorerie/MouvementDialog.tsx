'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { mouvementSchema, type MouvementFormData } from '@/lib/validations/mouvement'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  encaissement_client: 'Encaissement client',
  paiement_fournisseur: 'Paiement fournisseur',
  autre_entree: 'Autre entrée',
  autre_sortie: 'Autre sortie',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function MouvementDialog({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MouvementFormData>({
    resolver: zodResolver(mouvementSchema) as unknown as Resolver<MouvementFormData>,
    defaultValues: {
      date_mouvement: new Date().toISOString().split('T')[0],
      libelle: '',
      montant: 0,
      type: 'encaissement_client',
      reference_bancaire: '',
      rapproche: false,
    },
  })

  const watchedType = watch('type')
  const watchedRapproche = watch('rapproche')

  const onSubmit = async (data: MouvementFormData) => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Non authentifié')

      const { data: utilisateur } = await supabase
        .from('utilisateurs')
        .select('entreprise_id')
        .eq('id', userData.user.id)
        .single()

      if (!utilisateur) throw new Error('Utilisateur non trouvé')

      // For decaissements, store as negative
      const isDecaissement = data.type === 'paiement_fournisseur' || data.type === 'autre_sortie'
      const montantFinal = isDecaissement ? -Math.abs(data.montant) : Math.abs(data.montant)

      const { error } = await supabase.from('mouvements_tresorerie').insert({
        entreprise_id: utilisateur.entreprise_id,
        date_mouvement: data.date_mouvement,
        libelle: data.libelle,
        montant: montantFinal,
        type: data.type,
        reference_bancaire: data.reference_bancaire || null,
        rapproche: data.rapproche,
      })

      if (error) throw error

      toast.success('Mouvement enregistré')
      reset()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau mouvement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date_mouvement">Date</Label>
            <Input
              id="date_mouvement"
              type="date"
              {...register('date_mouvement')}
            />
            {errors.date_mouvement && (
              <p className="text-xs text-red-500">{errors.date_mouvement.message}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={watchedType}
              onValueChange={(val) => setValue('type', val as MouvementFormData['type'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-red-500">{errors.type.message}</p>
            )}
          </div>

          {/* Libelle */}
          <div className="space-y-1.5">
            <Label htmlFor="libelle">Libellé</Label>
            <Input
              id="libelle"
              placeholder="Description du mouvement"
              {...register('libelle')}
            />
            {errors.libelle && (
              <p className="text-xs text-red-500">{errors.libelle.message}</p>
            )}
          </div>

          {/* Montant */}
          <div className="space-y-1.5">
            <Label htmlFor="montant">Montant (EUR)</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('montant', { valueAsNumber: true })}
            />
            {errors.montant && (
              <p className="text-xs text-red-500">{errors.montant.message}</p>
            )}
          </div>

          {/* Reference bancaire */}
          <div className="space-y-1.5">
            <Label htmlFor="reference_bancaire">Référence bancaire (optionnel)</Label>
            <Input
              id="reference_bancaire"
              placeholder="Ex: VIR-2026-001"
              {...register('reference_bancaire')}
            />
          </div>

          {/* Rapproche */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="rapproche"
              checked={watchedRapproche}
              onCheckedChange={(checked: boolean) => setValue('rapproche', checked)}
            />
            <Label htmlFor="rapproche" className="cursor-pointer">
              Rapproché
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
