'use client'

import { useState, useRef } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  entrepriseSchema,
  facturationSchema,
  alertesSchema,
  type EntrepriseFormData,
  type FacturationFormData,
  type AlertesFormData,
} from '@/lib/validations/entreprise'
import type { Entreprise, Utilisateur, ObjectifCA } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatMontant } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Building2,
  FileText,
  Users,
  Bell,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
  Upload,
  X,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Target,
  Hash,
  CreditCard,
  ScrollText,
  RefreshCw,
  HardHat,
} from 'lucide-react'
import { PaiementTab } from './PaiementTab'
import { RelancesTab } from './RelancesTab'
import { EquipesTab, type EquipeData } from './EquipesTab'

interface Props {
  entreprise: Entreprise
  utilisateur: Utilisateur
  utilisateurs: Utilisateur[]
  objectifs: ObjectifCA[]
  equipes: EquipeData[]
}

export function ParametresPageContent({ entreprise, utilisateur, utilisateurs, objectifs, equipes }: Props) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-[#141414] mb-6">Paramètres</h1>

      <Tabs defaultValue="entreprise">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="entreprise">
            <Building2 className="h-4 w-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="facturation">
            <FileText className="h-4 w-4" />
            Facturation
          </TabsTrigger>
          <TabsTrigger value="utilisateurs">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="numerotation">
            <Hash className="h-4 w-4" />
            Numérotation
          </TabsTrigger>
          <TabsTrigger value="objectifs">
            <Target className="h-4 w-4" />
            Objectifs
          </TabsTrigger>
          <TabsTrigger value="paiement">
            <CreditCard className="h-4 w-4" />
            Paiement
          </TabsTrigger>
          <TabsTrigger value="cgv">
            <ScrollText className="h-4 w-4" />
            CGV
          </TabsTrigger>
          <TabsTrigger value="alertes">
            <Bell className="h-4 w-4" />
            Alertes
          </TabsTrigger>
          <TabsTrigger value="relances">
            <RefreshCw className="h-4 w-4" />
            Relances
          </TabsTrigger>
          <TabsTrigger value="equipes">
            <HardHat className="h-4 w-4" />
            Équipes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entreprise">
          <EntrepriseTab entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="facturation">
          <FacturationTab entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="utilisateurs">
          <UtilisateursTab utilisateur={utilisateur} utilisateurs={utilisateurs} />
        </TabsContent>

        <TabsContent value="numerotation">
          <NumerotationTab entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="objectifs">
          <ObjectifsTab objectifs={objectifs} />
        </TabsContent>

        <TabsContent value="paiement">
          <PaiementTab entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="cgv">
          <CGVTab entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="alertes">
          <AlertesTab entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="relances">
          <RelancesTab entreprise={entreprise} />
        </TabsContent>

        <TabsContent value="equipes">
          <EquipesTab equipes={equipes} utilisateurs={utilisateurs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// --- Logo Upload ---
function LogoUpload({ entreprise }: { entreprise: Entreprise }) {
  const [uploading, setUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(entreprise.logo_url || '')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const res = await fetch('/api/logo', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erreur upload')

      setLogoUrl(data.logo_url)
      toast.success('Logo mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    const supabase = createClient()
    await supabase
      .from('entreprises')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', entreprise.id)
    setLogoUrl('')
    toast.success('Logo supprimé')
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Logo de l&apos;entreprise</CardTitle>
        <CardDescription>
          Ce logo apparait dans la sidebar, sur vos devis et factures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Preview */}
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" width={80} height={80} className="w-full h-full object-contain p-1" />
            ) : (
              <Upload className="h-6 w-6 text-gray-300" />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {logoUrl ? 'Changer' : 'Ajouter un logo'}
              </Button>
              {logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemove} className="text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-400">PNG, JPG, SVG ou WebP. Max 2 Mo.</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// --- Entreprise Tab ---
function EntrepriseTab({ entreprise }: { entreprise: Entreprise }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EntrepriseFormData>({
    resolver: zodResolver(entrepriseSchema) as unknown as Resolver<EntrepriseFormData>,
    defaultValues: {
      nom: entreprise.nom || '',
      adresse: entreprise.adresse || '',
      code_postal: entreprise.code_postal || '',
      ville: entreprise.ville || '',
      pays: entreprise.pays || 'BE',
      tva_numero: entreprise.tva_numero || '',
      iban: entreprise.iban || '',
      telephone: entreprise.telephone || '',
      email: entreprise.email || '',
      logo_url: entreprise.logo_url || '',
    },
  })

  const onSubmit = async (data: EntrepriseFormData) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({
          nom: data.nom,
          adresse: data.adresse || null,
          code_postal: data.code_postal || null,
          ville: data.ville || null,
          pays: data.pays,
          tva_numero: data.tva_numero || null,
          iban: data.iban || null,
          telephone: data.telephone || null,
          email: data.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entreprise.id)

      if (error) throw error
      toast.success('Informations de l\'entreprise mises à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <LogoUpload entreprise={entreprise} />

      <Card>
        <CardHeader>
          <CardTitle>Informations de l&apos;entreprise</CardTitle>
          <CardDescription>
            Ces informations apparaissent sur vos devis et factures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nom */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nom">Nom de l&apos;entreprise</Label>
                <Input id="nom" {...register('nom')} />
                {errors.nom && <p className="text-xs text-red-500">{errors.nom.message}</p>}
              </div>

              {/* Adresse */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input id="adresse" {...register('adresse')} />
              </div>

              {/* Code postal */}
              <div className="space-y-1.5">
                <Label htmlFor="code_postal">Code postal</Label>
                <Input id="code_postal" {...register('code_postal')} />
              </div>

              {/* Ville */}
              <div className="space-y-1.5">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" {...register('ville')} />
              </div>

              {/* Pays */}
              <div className="space-y-1.5">
                <Label htmlFor="pays">Pays</Label>
                <Input id="pays" {...register('pays')} />
              </div>

              {/* TVA */}
              <div className="space-y-1.5">
                <Label htmlFor="tva_numero">N° TVA</Label>
                <Input id="tva_numero" placeholder="BE0123456789" {...register('tva_numero')} />
              </div>

              {/* IBAN */}
              <div className="space-y-1.5">
                <Label htmlFor="iban">IBAN</Label>
                <Input id="iban" placeholder="BE00 0000 0000 0000" {...register('iban')} />
              </div>

              {/* Telephone */}
              <div className="space-y-1.5">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" type="tel" {...register('telephone')} />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading || !isDirty}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Facturation Tab ---
function FacturationTab({ entreprise }: { entreprise: Entreprise }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FacturationFormData>({
    resolver: zodResolver(facturationSchema) as unknown as Resolver<FacturationFormData>,
    defaultValues: {
      conditions_paiement_defaut: entreprise.conditions_paiement_defaut || 'Comptant',
      delai_validite_devis_jours: entreprise.delai_validite_devis_jours || 30,
      mention_tva_defaut: entreprise.mention_tva_defaut || '',
    },
  })

  const onSubmit = async (data: FacturationFormData) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({
          conditions_paiement_defaut: data.conditions_paiement_defaut || 'Comptant',
          delai_validite_devis_jours: data.delai_validite_devis_jours,
          mention_tva_defaut: data.mention_tva_defaut || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entreprise.id)

      if (error) throw error
      toast.success('Paramètres de facturation mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres de facturation</CardTitle>
        <CardDescription>
          Valeurs par défaut utilisées lors de la création de devis et factures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Conditions de paiement */}
          <div className="space-y-1.5">
            <Label htmlFor="conditions_paiement_defaut">Conditions de paiement par défaut</Label>
            <Input
              id="conditions_paiement_defaut"
              placeholder="Ex: Comptant, 30 jours fin de mois"
              {...register('conditions_paiement_defaut')}
            />
          </div>

          {/* Delai validite devis */}
          <div className="space-y-1.5">
            <Label htmlFor="delai_validite_devis_jours">
              Délai de validité des devis (jours)
            </Label>
            <Input
              id="delai_validite_devis_jours"
              type="number"
              min="1"
              max="365"
              {...register('delai_validite_devis_jours', { valueAsNumber: true })}
            />
            {errors.delai_validite_devis_jours && (
              <p className="text-xs text-red-500">{errors.delai_validite_devis_jours.message}</p>
            )}
          </div>

          {/* Mention TVA */}
          <div className="space-y-1.5">
            <Label htmlFor="mention_tva_defaut">Mention TVA par défaut</Label>
            <Textarea
              id="mention_tva_defaut"
              placeholder="Ex: TVA due par le cocontractant (art. 20 AR n°1)"
              {...register('mention_tva_defaut')}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading || !isDirty}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// --- Utilisateurs Tab ---
const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  utilisateur: 'Utilisateur',
  comptable: 'Comptable',
  ouvrier: 'Ouvrier',
  equipe: 'Equipe',
  resp_equipe: 'Resp. Equipe',
}

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  super_admin: 'default',
  utilisateur: 'secondary',
  comptable: 'outline',
  ouvrier: 'outline',
  equipe: 'outline',
  resp_equipe: 'secondary',
}

interface UserFormState {
  nom: string
  prenom: string
  email: string
  role: 'super_admin' | 'utilisateur' | 'comptable' | 'ouvrier' | 'equipe' | 'resp_equipe'
}

const emptyForm: UserFormState = {
  nom: '',
  prenom: '',
  email: '',
  role: 'utilisateur',
}

function UtilisateursTab({ utilisateur, utilisateurs: initialUtilisateurs }: { utilisateur: Utilisateur; utilisateurs: Utilisateur[] }) {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>(initialUtilisateurs)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null)
  const [deletingUser, setDeletingUser] = useState<Utilisateur | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  const maxUsers = 5

  const openAddDialog = () => {
    setEditingUser(null)
    setForm(emptyForm)
    setTempPassword(null)
    setDialogOpen(true)
  }

  const openEditDialog = (u: Utilisateur) => {
    setEditingUser(u)
    setForm({
      nom: u.nom || '',
      prenom: u.prenom || '',
      email: u.email,
      role: u.role,
    })
    setTempPassword(null)
    setDialogOpen(true)
  }

  const openDeleteDialog = (u: Utilisateur) => {
    setDeletingUser(u)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingUser) {
        // Modifier
        const res = await fetch(`/api/utilisateurs/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: form.nom,
            prenom: form.prenom,
            role: form.role,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur')

        setUtilisateurs(prev =>
          prev.map(u => u.id === editingUser.id ? data.utilisateur : u)
        )
        toast.success('Utilisateur modifie')
        setDialogOpen(false)
      } else {
        // Creer
        const res = await fetch('/api/utilisateurs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur')

        setUtilisateurs(prev => [...prev, data.utilisateur])
        setTempPassword(data.tempPassword)
        toast.success('Utilisateur cree')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    setLoading(true)

    try {
      const res = await fetch(`/api/utilisateurs/${deletingUser.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setUtilisateurs(prev => prev.filter(u => u.id !== deletingUser.id))
      toast.success('Utilisateur supprime')
      setDeleteDialogOpen(false)
      setDeletingUser(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActif = async (u: Utilisateur) => {
    try {
      const res = await fetch(`/api/utilisateurs/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !u.actif }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setUtilisateurs(prev =>
        prev.map(item => item.id === u.id ? data.utilisateur : item)
      )
      toast.success(data.utilisateur.actif ? 'Utilisateur active' : 'Utilisateur desactive')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>
                {utilisateurs.length}/{maxUsers} utilisateurs
              </CardDescription>
            </div>
            <Button
              onClick={openAddDialog}
              size="sm"
              disabled={utilisateurs.length >= maxUsers}
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead>Derniere connexion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {utilisateurs.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.prenom || ''} {u.nom || ''}
                    {u.id === utilisateur.id && (
                      <span className="ml-2 text-xs text-[#9CA3AF]">(vous)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[#6B7280]">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[u.role] || 'secondary'}>
                      {roleLabels[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => handleToggleActif(u)}
                      disabled={u.id === utilisateur.id}
                      className="inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      title={u.id === utilisateur.id ? 'Vous ne pouvez pas vous desactiver' : u.actif ? 'Desactiver' : 'Activer'}
                    >
                      {u.actif ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-[#9CA3AF] text-sm">
                    {u.derniere_connexion
                      ? formatDate(u.derniere_connexion)
                      : '\u2014'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditDialog(u)}
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {u.id !== utilisateur.id && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDeleteDialog(u)}
                          title="Supprimer"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {utilisateurs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#9CA3AF] py-8">
                    Aucun utilisateur
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Ajouter / Modifier */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Modifiez les informations de l\'utilisateur.'
                : 'Un mot de passe temporaire sera genere. L\'utilisateur pourra le modifier.'}
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-800 mb-2">
                  Utilisateur cree avec succes !
                </p>
                <p className="text-xs text-emerald-700 mb-3">
                  Communiquez ce mot de passe temporaire a l&apos;utilisateur :
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-emerald-200 bg-white px-3 py-2 font-mono text-sm">
                    {showPassword ? tempPassword : '\u2022'.repeat(16)}
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => copyToClipboard(tempPassword)}
                    title="Copier"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setDialogOpen(false); setTempPassword(null) }}>
                  Fermer
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="user-prenom">Prenom</Label>
                  <Input
                    id="user-prenom"
                    value={form.prenom}
                    onChange={(e) => setForm(prev => ({ ...prev, prenom: e.target.value }))}
                    placeholder="Prenom"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-nom">Nom</Label>
                  <Input
                    id="user-nom"
                    value={form.nom}
                    onChange={(e) => setForm(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                  required
                  disabled={!!editingUser}
                />
                {editingUser && (
                  <p className="text-xs text-[#9CA3AF]">L&apos;email ne peut pas etre modifie.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-role">Role</Label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as UserFormState['role'] }))}
                  className="flex h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-1 text-sm transition-colors focus:border-[#17C2D7] focus:outline-none focus:ring-2 focus:ring-[#17C2D7]/20"
                >
                  <option value="utilisateur">Utilisateur</option>
                  <option value="comptable">Comptable</option>
                  <option value="resp_equipe">Resp. Equipe</option>
                  <option value="equipe">Equipe</option>
                  <option value="ouvrier">Ouvrier</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <p className="text-xs text-[#9CA3AF]">
                  {form.role === 'super_admin' && 'Acces complet a toutes les fonctionnalites.'}
                  {form.role === 'utilisateur' && 'Acces aux clients, devis et produits.'}
                  {form.role === 'comptable' && 'Acces aux factures, tresorerie et rapports.'}
                  {form.role === 'ouvrier' && 'Acces au planning en lecture seule. Peut completer les photos et commentaires.'}
                  {form.role === 'equipe' && 'Acces au planning en lecture seule. Peut completer les photos et champs d\'informations.'}
                  {form.role === 'resp_equipe' && 'Acces aux chantiers et planning. Peut gerer et organiser les chantiers.'}
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingUser ? 'Enregistrer' : 'Creer l\'utilisateur'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmer Suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. L&apos;utilisateur{' '}
              <strong>{deletingUser?.prenom} {deletingUser?.nom}</strong>{' '}
              ({deletingUser?.email}) sera definitivement supprime et ne pourra plus se connecter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- Objectifs Tab ---
function ObjectifsTab({ objectifs: initialObjectifs }: { objectifs: ObjectifCA[] }) {
  const [objectifs, setObjectifs] = useState<ObjectifCA[]>(initialObjectifs)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editAnnee, setEditAnnee] = useState<number | null>(null)
  const [formAnnee, setFormAnnee] = useState(new Date().getFullYear())
  const [formMontant, setFormMontant] = useState('')

  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i)

  const openAddDialog = () => {
    setEditAnnee(null)
    // Trouver la premiere annee non utilisee
    const usedYears = objectifs.map(o => o.annee)
    const nextYear = availableYears.find(y => !usedYears.includes(y)) || currentYear
    setFormAnnee(nextYear)
    setFormMontant('')
    setDialogOpen(true)
  }

  const openEditDialog = (obj: ObjectifCA) => {
    setEditAnnee(obj.annee)
    setFormAnnee(obj.annee)
    setFormMontant(obj.montant.toString())
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montant = parseFloat(formMontant)
    if (isNaN(montant) || montant < 0) {
      toast.error('Montant invalide')
      return
    }
    setLoading(true)

    try {
      const res = await fetch('/api/objectifs-ca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annee: formAnnee, montant }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setObjectifs(prev => {
        const existing = prev.findIndex(o => o.annee === formAnnee)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = data.objectif
          return updated
        }
        return [...prev, data.objectif].sort((a, b) => b.annee - a.annee)
      })
      toast.success(editAnnee ? 'Objectif mis a jour' : 'Objectif ajoute')
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (annee: number) => {
    try {
      const res = await fetch(`/api/objectifs-ca?annee=${annee}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      setObjectifs(prev => prev.filter(o => o.annee !== annee))
      toast.success('Objectif supprime')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Objectifs de chiffre d&apos;affaires</CardTitle>
              <CardDescription>
                Definissez un objectif de CA annuel pour suivre votre progression sur le tableau de bord.
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {objectifs.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-10 w-10 text-[#E5E7EB] mx-auto mb-3" />
              <p className="text-[#9CA3AF] text-sm">Aucun objectif defini</p>
              <p className="text-[#9CA3AF] text-xs mt-1">Ajoutez un objectif annuel pour visualiser votre progression.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Annee</TableHead>
                  <TableHead>Objectif CA</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objectifs.map((obj) => (
                  <TableRow key={obj.annee}>
                    <TableCell className="font-medium">
                      {obj.annee}
                      {obj.annee === currentYear && (
                        <Badge variant="default" className="ml-2 text-[10px]">En cours</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[#111827] font-semibold tabular-nums">
                      {formatMontant(obj.montant)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditDialog(obj)}
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(obj.annee)}
                          title="Supprimer"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editAnnee ? `Modifier l'objectif ${editAnnee}` : 'Nouvel objectif annuel'}
            </DialogTitle>
            <DialogDescription>
              Definissez le chiffre d&apos;affaires cible pour l&apos;annee.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="obj-annee">Annee</Label>
              <select
                id="obj-annee"
                value={formAnnee}
                onChange={(e) => setFormAnnee(parseInt(e.target.value))}
                disabled={!!editAnnee}
                className="flex h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-1 text-sm transition-colors focus:border-[#17C2D7] focus:outline-none focus:ring-2 focus:ring-[#17C2D7]/20 disabled:opacity-50"
              >
                {availableYears.map(y => (
                  <option key={y} value={y} disabled={!editAnnee && objectifs.some(o => o.annee === y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obj-montant">Objectif CA (EUR HT)</Label>
              <Input
                id="obj-montant"
                type="number"
                step="1000"
                min="0"
                value={formMontant}
                onChange={(e) => setFormMontant(e.target.value)}
                placeholder="Ex: 500000"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editAnnee ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Numerotation Tab ---
function NumerotationTab({ entreprise }: { entreprise: Entreprise }) {
  const [loading, setLoading] = useState(false)
  const [prefixeDevis, setPrefixeDevis] = useState(entreprise.prefixe_devis || 'DEV')
  const [prefixeFacture, setPrefixeFacture] = useState(entreprise.prefixe_facture || 'FAC')
  const [prefixeAvoir, setPrefixeAvoir] = useState(entreprise.prefixe_avoir || 'AVO')
  const supabase = createClient()

  const currentYear = new Date().getFullYear()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prefixeDevis.trim() || !prefixeFacture.trim() || !prefixeAvoir.trim()) {
      toast.error('Tous les prefixes sont obligatoires')
      return
    }

    // Validate: only uppercase letters, numbers, hyphens
    const regex = /^[A-Z0-9-]+$/
    if (!regex.test(prefixeDevis) || !regex.test(prefixeFacture) || !regex.test(prefixeAvoir)) {
      toast.error('Les prefixes ne peuvent contenir que des lettres majuscules, chiffres et tirets')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({
          prefixe_devis: prefixeDevis.trim().toUpperCase(),
          prefixe_facture: prefixeFacture.trim().toUpperCase(),
          prefixe_avoir: prefixeAvoir.trim().toUpperCase(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', entreprise.id)

      if (error) throw error
      toast.success('Prefixes de numerotation mis a jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const isDirty =
    prefixeDevis !== (entreprise.prefixe_devis || 'DEV') ||
    prefixeFacture !== (entreprise.prefixe_facture || 'FAC') ||
    prefixeAvoir !== (entreprise.prefixe_avoir || 'AVO')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Numerotation des documents</CardTitle>
        <CardDescription>
          Configurez les prefixes utilises pour generer les numeros de devis, factures et notes de credit.
          Le format final sera : <strong>PREFIXE-ANNEE-NUMERO</strong> (ex: FAC-2026-0001).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Devis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="prefixe_devis">Prefixe Devis</Label>
              <Input
                id="prefixe_devis"
                value={prefixeDevis}
                onChange={(e) => setPrefixeDevis(e.target.value.toUpperCase())}
                placeholder="DEV"
                maxLength={10}
              />
            </div>
            <div className="flex items-center gap-2 h-9">
              <span className="text-[12px] text-[#9CA3AF] uppercase tracking-wide">Apercu :</span>
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                {prefixeDevis || 'DEV'}-{currentYear}-0001
              </Badge>
            </div>
          </div>

          {/* Facture */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="prefixe_facture">Prefixe Facture</Label>
              <Input
                id="prefixe_facture"
                value={prefixeFacture}
                onChange={(e) => setPrefixeFacture(e.target.value.toUpperCase())}
                placeholder="FAC"
                maxLength={10}
              />
            </div>
            <div className="flex items-center gap-2 h-9">
              <span className="text-[12px] text-[#9CA3AF] uppercase tracking-wide">Apercu :</span>
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                {prefixeFacture || 'FAC'}-{currentYear}-0001
              </Badge>
            </div>
          </div>

          {/* Avoir / Note de crédit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="prefixe_avoir">Prefixe Note de credit (Avoir)</Label>
              <Input
                id="prefixe_avoir"
                value={prefixeAvoir}
                onChange={(e) => setPrefixeAvoir(e.target.value.toUpperCase())}
                placeholder="AVO"
                maxLength={10}
              />
            </div>
            <div className="flex items-center gap-2 h-9">
              <span className="text-[12px] text-[#9CA3AF] uppercase tracking-wide">Apercu :</span>
              <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                {prefixeAvoir || 'AVO'}-{currentYear}-0001
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-[#FEF3C7] bg-[#FFFBEB] p-3">
            <p className="text-[13px] text-[#92400E]">
              <strong>Important :</strong> Modifier un prefixe ne change pas les numeros deja attribues.
              Les nouveaux numeros utiliseront le nouveau prefixe. La numerotation sequentielle est
              obligatoire en comptabilite belge (sans trou).
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading || !isDirty}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// --- Alertes Tab ---
function AlertesTab({ entreprise }: { entreprise: Entreprise }) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<AlertesFormData>({
    resolver: zodResolver(alertesSchema) as unknown as Resolver<AlertesFormData>,
    defaultValues: {
      seuil_alerte_tresorerie: entreprise.seuil_alerte_tresorerie || 5000,
    },
  })

  const onSubmit = async (data: AlertesFormData) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('entreprises')
        .update({
          seuil_alerte_tresorerie: data.seuil_alerte_tresorerie,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entreprise.id)

      if (error) throw error
      toast.success('Seuil d\'alerte mis à jour')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes</CardTitle>
        <CardDescription>
          Configurez les seuils d&apos;alerte pour la trésorerie.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="seuil_alerte_tresorerie">
              Seuil d&apos;alerte trésorerie (EUR)
            </Label>
            <Input
              id="seuil_alerte_tresorerie"
              type="number"
              step="100"
              min="0"
              {...register('seuil_alerte_tresorerie', { valueAsNumber: true })}
            />
            {errors.seuil_alerte_tresorerie && (
              <p className="text-xs text-red-500">{errors.seuil_alerte_tresorerie.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Vous recevrez une alerte lorsque le solde de trésorerie descendra en dessous de{' '}
              {formatMontant(entreprise.seuil_alerte_tresorerie || 5000)}.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={loading || !isDirty}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// === CGV Tab ===
function CGVTab({ entreprise }: { entreprise: Entreprise }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [cgv, setCgv] = useState(entreprise.conditions_generales_vente || '')
  const [saved, setSaved] = useState(true)

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('entreprises')
      .update({ conditions_generales_vente: cgv })
      .eq('id', entreprise.id)
    setLoading(false)
    if (error) {
      toast.error('Erreur lors de la sauvegarde')
    } else {
      toast.success('Conditions generales enregistrees')
      setSaved(true)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-[#17C2D7]" />
          Conditions generales de vente
        </CardTitle>
        <CardDescription>
          Ces conditions seront affichees sur la page de signature des devis. Le client devra les accepter avant de signer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Texte des conditions generales de vente</Label>
          <Textarea
            value={cgv}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setCgv(e.target.value)
              setSaved(false)
            }}
            rows={20}
            placeholder={"Saisissez vos conditions generales de vente ici...\n\nExemple :\nArticle 1 - Objet\nLes presentes conditions generales de vente s'appliquent a toutes les prestations...\n\nArticle 2 - Devis et commandes\nTout devis signe par le client vaut commande ferme...\n\nArticle 3 - Conditions de paiement\nLe paiement s'effectue selon les modalites indiquees..."}
            className="font-mono text-[13px] leading-relaxed"
          />
          <p className="text-[11px] text-[#9CA3AF]">
            Ce texte sera affiche integralement sur la page de signature du devis.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button onClick={handleSave} disabled={loading || saved}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
