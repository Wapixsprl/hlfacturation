'use client'

import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientSchema, type ClientFormData } from '@/lib/validations/client'
import type { Client } from '@/types/database'
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
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  onSuccess: () => void
}

const PAYS_OPTIONS = [
  { value: 'BE', label: 'Belgique' },
  { value: 'FR', label: 'France' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'NL', label: 'Pays-Bas' },
  { value: 'DE', label: 'Allemagne' },
]

export function ClientDialog({ open, onOpenChange, client, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [tvaLoading, setTvaLoading] = useState(false)
  const [tvaResult, setTvaResult] = useState<{
    valide: boolean
    nom: string
    adresse: string
  } | null>(null)
  const [showFacturation, setShowFacturation] = useState(false)
  const [showLivraison, setShowLivraison] = useState(false)
  const supabase = createClient()
  const isEdit = !!client

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormData>,
    defaultValues: {
      type: 'particulier',
      nom: '',
      prenom: '',
      raison_sociale: '',
      adresse: '',
      code_postal: '',
      ville: '',
      pays: 'BE',
      email: '',
      telephone: '',
      telephone2: '',
      tva_numero: '',
      iban: '',
      notes: '',
      adresse_facturation: '',
      code_postal_facturation: '',
      ville_facturation: '',
      pays_facturation: 'BE',
      adresse_livraison: '',
      code_postal_livraison: '',
      ville_livraison: '',
      pays_livraison: 'BE',
    },
  })

  const clientType = form.watch('type')

  useEffect(() => {
    if (open) {
      setTvaResult(null)
      if (client) {
        form.reset({
          type: client.type || 'particulier',
          nom: client.nom || '',
          prenom: client.prenom || '',
          raison_sociale: client.raison_sociale || '',
          adresse: client.adresse || '',
          code_postal: client.code_postal || '',
          ville: client.ville || '',
          pays: client.pays || 'BE',
          email: client.email || '',
          telephone: client.telephone || '',
          telephone2: client.telephone2 || '',
          tva_numero: client.tva_numero || '',
          iban: client.iban || '',
          notes: client.notes || '',
          adresse_facturation: client.adresse_facturation || '',
          code_postal_facturation: client.code_postal_facturation || '',
          ville_facturation: client.ville_facturation || '',
          pays_facturation: client.pays_facturation || 'BE',
          adresse_livraison: client.adresse_livraison || '',
          code_postal_livraison: client.code_postal_livraison || '',
          ville_livraison: client.ville_livraison || '',
          pays_livraison: client.pays_livraison || 'BE',
        })
        // Ouvrir les sections si déjà remplies
        setShowFacturation(!!(client.adresse_facturation || client.ville_facturation))
        setShowLivraison(!!(client.adresse_livraison || client.ville_livraison))
      } else {
        form.reset({
          type: 'particulier',
          nom: '',
          prenom: '',
          raison_sociale: '',
          adresse: '',
          code_postal: '',
          ville: '',
          pays: 'BE',
          email: '',
          telephone: '',
          telephone2: '',
          tva_numero: '',
          iban: '',
          notes: '',
          adresse_facturation: '',
          code_postal_facturation: '',
          ville_facturation: '',
          pays_facturation: 'BE',
          adresse_livraison: '',
          code_postal_livraison: '',
          ville_livraison: '',
          pays_livraison: 'BE',
        })
        setShowFacturation(false)
        setShowLivraison(false)
      }
    }
  }, [open, client, form])

  const verifierTVA = async () => {
    const numero = form.getValues('tva_numero')
    if (!numero) return
    setTvaLoading(true)
    try {
      const res = await fetch('/api/tva/verifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero }),
      })
      const data = await res.json()
      setTvaResult(data)
      if (data.valide) {
        if (data.nom) form.setValue('raison_sociale', data.nom)
        if (data.adresse) form.setValue('adresse', data.adresse)
        // Auto-detect pays from TVA prefix
        const prefix = numero.replace(/[\s.]/g, '').substring(0, 2).toUpperCase()
        if (prefix === 'FR') form.setValue('pays', 'FR')
        else if (prefix === 'LU') form.setValue('pays', 'LU')
        else if (prefix === 'NL') form.setValue('pays', 'NL')
        else if (prefix === 'DE') form.setValue('pays', 'DE')
        toast.success('Numero TVA valide')
      } else {
        toast.error('Numero TVA invalide')
      }
    } catch {
      toast.error('Erreur de verification TVA')
    }
    setTvaLoading(false)
  }

  const onSubmit = async (data: ClientFormData) => {
    setLoading(true)
    const payload = {
      ...data,
      tva_valide: tvaResult?.valide ?? client?.tva_valide ?? null,
    }

    if (isEdit) {
      const { error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', client.id)
      if (error) {
        toast.error('Erreur lors de la modification')
        setLoading(false)
        return
      }
      toast.success('Client modifie')
    } else {
      const { data: user } = await supabase.auth.getUser()
      const { data: utilisateur } = await supabase
        .from('utilisateurs')
        .select('entreprise_id')
        .eq('id', user.user!.id)
        .single()

      const { error } = await supabase
        .from('clients')
        .insert({ ...payload, entreprise_id: utilisateur!.entreprise_id })
      if (error) {
        toast.error('Erreur lors de la creation')
        setLoading(false)
        return
      }
      toast.success('Client cree')
    }

    setLoading(false)
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={(value) => onOpenChange(value)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold text-[#141414]">{isEdit ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Type switch */}
          <div className="flex items-center gap-3">
            <Label className="text-[13px] text-[#707070]">Type :</Label>
            <div className="flex items-center gap-2">
              <span
                className={
                  clientType === 'particulier' ? 'text-[13px] font-medium text-[#141414]' : 'text-[13px] text-[#ADADAD]'
                }
              >
                Particulier
              </span>
              <Switch
                checked={clientType === 'professionnel'}
                onCheckedChange={(checked) =>
                  form.setValue('type', checked ? 'professionnel' : 'particulier')
                }
              />
              <span
                className={
                  clientType === 'professionnel' ? 'text-[13px] font-medium text-[#141414]' : 'text-[13px] text-[#ADADAD]'
                }
              >
                Professionnel
              </span>
            </div>
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientType === 'professionnel' && (
              <div className="md:col-span-2 space-y-2">
                <Label>Raison sociale / Nom de l{"'"}entreprise</Label>
                <Input {...form.register('raison_sociale')} placeholder="Nom de l'entreprise" />
              </div>
            )}
            <div className="space-y-2">
              <Label>{clientType === 'professionnel' ? 'Nom du contact *' : 'Nom *'}</Label>
              <Input {...form.register('nom')} />
              {form.formState.errors.nom && (
                <p className="text-[12px] text-[#DC2626]">{form.formState.errors.nom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{clientType === 'professionnel' ? 'Prenom du contact' : 'Prenom'}</Label>
              <Input {...form.register('prenom')} />
            </div>
          </div>

          {/* TVA for professionals */}
          {clientType === 'professionnel' && (
            <div className="space-y-2">
              <Label>Numero de TVA</Label>
              <div className="flex gap-2">
                <Input
                  {...form.register('tva_numero')}
                  placeholder="BE0123456789 ou FR12345678901"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={verifierTVA} disabled={tvaLoading}>
                  {tvaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verifier'}
                </Button>
                {tvaResult && (
                  tvaResult.valide ? (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 self-center" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0 self-center" />
                  )
                )}
              </div>
              <p className="text-[11px] text-[#9CA3AF]">
                Formats acceptes : BE0123456789, FR12345678901, LU12345678, etc.
              </p>
            </div>
          )}

          {/* Adresse principale */}
          <div>
            <Label className="text-[13px] font-semibold text-[#141414] mb-3 block">Adresse principale</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Input {...form.register('adresse')} placeholder="Rue et numero" />
              </div>
              <div className="space-y-2">
                <Input {...form.register('code_postal')} placeholder="Code postal" />
              </div>
              <div className="space-y-2">
                <Input {...form.register('ville')} placeholder="Ville" />
              </div>
              <div className="space-y-2">
                <select
                  {...form.register('pays')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PAYS_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Adresse de facturation (collapsible) */}
          <div>
            <button
              type="button"
              className="flex items-center gap-2 text-[13px] font-medium text-[#17C2D7] hover:text-[#17C2D7]/80 transition-colors"
              onClick={() => setShowFacturation(!showFacturation)}
            >
              {showFacturation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Adresse de facturation {!showFacturation && '(si differente)'}
            </button>
            {showFacturation && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pl-6 border-l-2 border-[#17C2D7]/20">
                <div className="md:col-span-2 space-y-2">
                  <Input {...form.register('adresse_facturation')} placeholder="Rue et numero" />
                </div>
                <div className="space-y-2">
                  <Input {...form.register('code_postal_facturation')} placeholder="Code postal" />
                </div>
                <div className="space-y-2">
                  <Input {...form.register('ville_facturation')} placeholder="Ville" />
                </div>
                <div className="space-y-2">
                  <select
                    {...form.register('pays_facturation')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PAYS_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Adresse de livraison (collapsible) */}
          <div>
            <button
              type="button"
              className="flex items-center gap-2 text-[13px] font-medium text-[#17C2D7] hover:text-[#17C2D7]/80 transition-colors"
              onClick={() => setShowLivraison(!showLivraison)}
            >
              {showLivraison ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Adresse de livraison {!showLivraison && '(si differente)'}
            </button>
            {showLivraison && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pl-6 border-l-2 border-[#17C2D7]/20">
                <div className="md:col-span-2 space-y-2">
                  <Input {...form.register('adresse_livraison')} placeholder="Rue et numero" />
                </div>
                <div className="space-y-2">
                  <Input {...form.register('code_postal_livraison')} placeholder="Code postal" />
                </div>
                <div className="space-y-2">
                  <Input {...form.register('ville_livraison')} placeholder="Ville" />
                </div>
                <div className="space-y-2">
                  <select
                    {...form.register('pays_livraison')}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {PAYS_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-[12px] text-[#DC2626]">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Telephone</Label>
              <Input {...form.register('telephone')} />
            </div>
            <div className="space-y-2">
              <Label>Telephone 2</Label>
              <Input {...form.register('telephone2')} />
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
              {isEdit ? 'Enregistrer' : 'Creer le client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
