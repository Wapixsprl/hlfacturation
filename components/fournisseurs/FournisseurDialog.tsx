'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fournisseurSchema, type FournisseurFormData } from '@/lib/validations/fournisseur'
import type { Fournisseur } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  fournisseur: Fournisseur | null
  onSuccess: () => void
}

export function FournisseurDialog({ open, onOpenChange, fournisseur, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const isEdit = !!fournisseur

  const form = useForm<FournisseurFormData>({
    resolver: zodResolver(fournisseurSchema) as unknown as Resolver<FournisseurFormData>,
    defaultValues: {
      raison_sociale: '',
      contact_nom: '',
      adresse: '',
      code_postal: '',
      ville: '',
      pays: 'BE',
      email: '',
      telephone: '',
      tva_numero: '',
      iban: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (fournisseur) {
        form.reset({
          raison_sociale: fournisseur.raison_sociale || '',
          contact_nom: fournisseur.contact_nom || '',
          adresse: fournisseur.adresse || '',
          code_postal: fournisseur.code_postal || '',
          ville: fournisseur.ville || '',
          pays: fournisseur.pays || 'BE',
          email: fournisseur.email || '',
          telephone: fournisseur.telephone || '',
          tva_numero: fournisseur.tva_numero || '',
          iban: fournisseur.iban || '',
          notes: fournisseur.notes || '',
        })
      } else {
        form.reset({
          raison_sociale: '',
          contact_nom: '',
          adresse: '',
          code_postal: '',
          ville: '',
          pays: 'BE',
          email: '',
          telephone: '',
          tva_numero: '',
          iban: '',
          notes: '',
        })
      }
    }
  }, [open, fournisseur, form])

  const onSubmit = async (data: FournisseurFormData) => {
    setLoading(true)

    if (isEdit) {
      const { error } = await supabase
        .from('fournisseurs')
        .update(data)
        .eq('id', fournisseur.id)
      if (error) {
        toast.error('Erreur lors de la modification')
        setLoading(false)
        return
      }
      toast.success('Fournisseur modifié')
    } else {
      const { data: user } = await supabase.auth.getUser()
      const { data: utilisateur } = await supabase
        .from('utilisateurs')
        .select('entreprise_id')
        .eq('id', user.user!.id)
        .single()

      const { error } = await supabase
        .from('fournisseurs')
        .insert({ ...data, entreprise_id: utilisateur!.entreprise_id })
      if (error) {
        toast.error('Erreur lors de la création')
        setLoading(false)
        return
      }
      toast.success('Fournisseur créé')
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => onOpenChange(value)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Raison sociale & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Raison sociale *</Label>
              <Input {...form.register('raison_sociale')} />
              {form.formState.errors.raison_sociale && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.raison_sociale.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nom du contact</Label>
              <Input {...form.register('contact_nom')} />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Adresse</Label>
              <Input {...form.register('adresse')} />
            </div>
            <div className="space-y-2">
              <Label>Code postal</Label>
              <Input {...form.register('code_postal')} />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input {...form.register('ville')} />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input {...form.register('pays')} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input {...form.register('telephone')} />
            </div>
          </div>

          {/* TVA & IBAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numéro de TVA</Label>
              <Input {...form.register('tva_numero')} placeholder="BE0123456789" />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input {...form.register('iban')} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register('notes')} rows={3} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#141414] hover:bg-[#141414]/90"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isEdit ? 'Enregistrer' : 'Créer le fournisseur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
