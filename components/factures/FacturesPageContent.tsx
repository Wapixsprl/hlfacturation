'use client'

import { useState, useMemo } from 'react'
import { useTableSort, type ColumnConfig } from '@/lib/hooks/useTableSort'
import { SortableTableHead } from '@/components/shared/SortableTableHead'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Facture, Client } from '@/types/database'
import { formatMontant, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Archive,
  Receipt,
  Send,
  Loader2,
  Download,
  CreditCard,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileMinus,
  Landmark,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUser } from '@/lib/hooks/useUser'
import { PaiementDialog } from './PaiementDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const statutConfig: Record<string, { label: string; className: string }> = {
  brouillon: {
    label: 'Brouillon',
    className: 'bg-[#F3F4F6] text-[#6B7280]',
  },
  envoyee: {
    label: 'Envoyee',
    className: 'bg-[#F5B400]/10 text-[#F5B400]',
  },
  partiellement_payee: {
    label: 'Partiel',
    className: 'bg-[#FEF3C7] text-[#D97706]',
  },
  payee: {
    label: 'Payee',
    className: 'bg-[#D1FAE5] text-[#059669]',
  },
  en_retard: {
    label: 'En retard',
    className: 'bg-[#FEE2E2] text-[#DC2626]',
  },
}

type FactureWithClient = Facture & {
  client: Pick<Client, 'nom' | 'prenom' | 'raison_sociale' | 'type'> | null
  devis?: { titre: string | null; reference_chantier: string | null } | null
  total_paye?: number
  taux_tva_list?: number[]
  avoir_deduit_ttc?: number  // somme des avoirs émis sur cette facture
}

// Renvoie la meilleure reference disponible pour une facture
// Priorite : titre du devis > reference_chantier du devis > rien
function getFactureReference(f: FactureWithClient): string {
  if (f.devis?.titre) return f.devis.titre
  if (f.devis?.reference_chantier) return f.devis.reference_chantier
  return ''
}

interface Props {
  initialFactures: FactureWithClient[]
  canViewDashboard?: boolean
  initialTvaMap?: Record<string, number[]>
}

const TVA_BADGE: Record<number, string> = {
  0:  'bg-[#F3F4F6] text-[#6B7280]',
  6:  'bg-[#D1FAE5] text-[#059669]',
  12: 'bg-[#FEF3C7] text-[#D97706]',
  21: 'bg-[#DBEAFE] text-[#1D4ED8]',
}

export function FacturesPageContent({ initialFactures, initialTvaMap = {}, canViewDashboard = true }: Props) {
  const [facturesList, setFacturesList] = useState(initialFactures)
  const [tvaMap] = useState<Record<string, number[]>>(initialTvaMap)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('tous')
  const [typeFilter, setTypeFilter] = useState('tous')
  const today = new Date()
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const todayStr = today.toISOString().split('T')[0]
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [journalOpen, setJournalOpen] = useState(false)
  const [jDebut, setJDebut] = useState(`${today.getFullYear()}-01-01`)
  const [jFin, setJFin] = useState(todayStr)
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null)
  const [paiementFacture, setPaiementFacture] = useState<FactureWithClient | null>(null)
  const [showArchives, setShowArchives] = useState(false)
  const [archivedList, setArchivedList] = useState<FactureWithClient[]>([])
  const router = useRouter()
  const supabase = createClient()
  const { utilisateur } = useUser()

  type AvoirLigne = { id: string; designation: string | null; total_ht: number; taux_tva: number; montant: number; checked: boolean }
  const [avoirDialog, setAvoirDialog] = useState<FactureWithClient | null>(null)
  const [avoirType, setAvoirType] = useState<'total' | 'partiel'>('total')
  const [avoirLignes, setAvoirLignes] = useState<AvoirLigne[]>([])
  const [avoirLoading, setAvoirLoading] = useState(false)

  const getClientName = (f: FactureWithClient): string => {
    if (!f.client) return '\u2014'
    if (f.client.type === 'professionnel' && f.client.raison_sociale) {
      return f.client.raison_sociale
    }
    return (
      [f.client.prenom, f.client.nom].filter(Boolean).join(' ') || '\u2014'
    )
  }

  const filtered = facturesList.filter((f) => {
    const clientName = getClientName(f)
    const matchSearch = [f.numero, clientName, getFactureReference(f)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchStatut = statutFilter === 'tous' || f.statut === statutFilter
    const matchType = typeFilter === 'tous' || f.type === typeFilter
    const matchDateDebut = !dateDebut || f.date_facture >= dateDebut
    const matchDateFin = !dateFin || f.date_facture <= dateFin
    return matchSearch && matchStatut && matchType && matchDateDebut && matchDateFin
  })

  // Statistics computed on filtered results (HTVA + TVA separes)
  const stats = useMemo(() => {
    const totalFactureHT = filtered.reduce((sum, f) => sum + (Number(f.total_ht) || 0), 0)
    const totalFactureTVA = filtered.reduce((sum, f) => sum + (Number(f.total_tva) || 0), 0)
    // Paye et impaye restent en TTC (c'est ce qui compte pour la tresorerie)
    const totalPaye = filtered.reduce((sum, f) => {
      if (f.statut === 'payee') return sum + f.total_ttc
      return sum + (f.total_paye || 0)
    }, 0)
    const totalImpaye = filtered.reduce((sum, f) => {
      if (f.statut === 'payee' || f.statut === 'brouillon') return sum
      const du = Math.max(0,
        (Number(f.total_ttc) || 0)
        - (Number(f.montant_acomptes_deduits) || 0)
        - (Number(f.avoir_deduit_ttc) || 0)
      )
      const paye = f.total_paye || 0
      return sum + Math.max(0, du - paye)
    }, 0)
    const nbEnRetard = filtered.filter((f) => f.statut === 'en_retard').length
    const nbPayees = filtered.filter((f) => f.statut === 'payee').length

    return { totalFactureHT, totalFactureTVA, totalPaye, totalImpaye, nbEnRetard, nbPayees }
  }, [filtered])

  const handleEnvoyer = async (id: string) => {
    setSendingId(id)
    try {
      const res = await fetch(`/api/factures/${id}/envoyer`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'envoi")
      } else if (data.warning) {
        toast.warning(data.warning)
        setFacturesList((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, statut: 'envoyee' as const } : f
          )
        )
      } else {
        toast.success('Facture envoyee avec succes !')
        setFacturesList((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, statut: 'envoyee' as const } : f
          )
        )
      }
    } catch {
      toast.error("Erreur lors de l'envoi de la facture")
      await refreshFactures()
    }
    setSendingId(null)
  }

  const [peppolSendingId, setPeppolSendingId] = useState<string | null>(null)
  const handleEnvoyerPeppol = async (id: string) => {
    setPeppolSendingId(id)
    try {
      const res = await fetch(`/api/peppol/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur envoi Peppol')
      } else {
        toast.success(
          data.test_mode
            ? 'Envoye via Peppol (mode test : par email)'
            : 'Envoye via Peppol au reseau B2B'
        )
        setFacturesList((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, peppol_statut: 'envoye' as const } : f
          )
        )
      }
    } catch {
      toast.error('Erreur reseau Peppol')
    }
    setPeppolSendingId(null)
    setConfirmSendId(null)
  }

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('factures')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error("Erreur lors de l'archivage")
    } else {
      toast.success('Facture archivee')
      setFacturesList((prev) => prev.filter((f) => f.id !== id))
    }
  }

  const handleChangeStatut = async (
    id: string,
    newStatut: 'brouillon' | 'envoyee' | 'partiellement_payee' | 'payee' | 'en_retard'
  ) => {
    const { error } = await supabase
      .from('factures')
      .update({ statut: newStatut, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Erreur lors du changement de statut')
    } else {
      toast.success('Statut mis a jour')
      setFacturesList((prev) =>
        prev.map((f) => (f.id === id ? { ...f, statut: newStatut } : f))
      )
    }
  }

  const handleOpenAvoir = async (f: FactureWithClient) => {
    const { data: lignes } = await supabase
      .from('factures_lignes')
      .select('id, designation, total_ht, taux_tva')
      .eq('facture_id', f.id)
      .eq('type', 'produit')
      .order('ordre')
    setAvoirLignes((lignes || []).map((l) => ({
      id: l.id,
      designation: l.designation,
      total_ht: l.total_ht,
      taux_tva: l.taux_tva,
      montant: l.total_ht,
      checked: true,
    })))
    setAvoirType('total')
    setAvoirDialog(f)
  }

  const handleCreateAvoir = async () => {
    if (!avoirDialog) return
    setAvoirLoading(true)
    try {
      const body = avoirType === 'total'
        ? { type: 'total' }
        : {
            type: 'partiel',
            lignes: avoirLignes
              .filter((l) => l.checked && l.montant > 0)
              .map((l) => ({ ligne_id: l.id, montant_ht: l.montant })),
          }
      const res = await fetch(`/api/factures/${avoirDialog.id}/avoir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erreur création note de crédit')
      } else {
        toast.success(`Note de crédit ${data.numero} créée`)
        setAvoirDialog(null)
        router.push(`/factures/${data.avoir_id}`)
      }
    } catch {
      toast.error('Erreur réseau')
    }
    setAvoirLoading(false)
  }

  const handleDesarchiver = async (id: string) => {
    const { error } = await supabase
      .from('factures')
      .update({ archived_at: null })
      .eq('id', id)
    if (error) {
      toast.error("Erreur lors du désarchivage")
    } else {
      toast.success('Facture restaurée')
      setArchivedList((prev) => prev.filter((f) => f.id !== id))
      await refreshFactures()
    }
  }

  const loadArchives = async () => {
    const { data } = await supabase
      .from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type)')
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
    setArchivedList((data as FactureWithClient[]) || [])
  }

  const refreshFactures = async () => {
    const { data } = await supabase
      .from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type)')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (data) {
      const ids = data.map((f: FactureWithClient) => f.id)
      if (ids.length > 0) {
        const [{ data: paiements }] = await Promise.all([
          supabase
            .from('paiements_clients')
            .select('facture_id, montant')
            .in('facture_id', ids),
        ])
        const paiementMap: Record<string, number> = {}
        for (const p of paiements || []) {
          paiementMap[p.facture_id] = (paiementMap[p.facture_id] || 0) + p.montant
        }
        setFacturesList(data.map((f: FactureWithClient) => ({
          ...f,
          total_paye: paiementMap[f.id] || 0,
          taux_tva_list: tvaMap[f.id] || [],
        })))
      } else {
        setFacturesList([])
      }
    }
  }

  const getEcheanceColor = (f: FactureWithClient): string => {
    if (!f.date_echeance || f.statut === 'payee' || f.statut === 'brouillon') return 'text-[#9CA3AF]'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const echeance = new Date(f.date_echeance)
    echeance.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((echeance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'text-[#DC2626] font-semibold'
    if (diffDays <= 7) return 'text-[#D97706] font-semibold'
    return 'text-[#9CA3AF]'
  }

  const getRestePayer = (f: FactureWithClient): number => {
    if (f.statut === 'payee') return 0
    const du = Math.max(0,
      (Number(f.total_ttc) || 0)
      - (Number(f.montant_acomptes_deduits) || 0)
      - (Number(f.avoir_deduit_ttc) || 0)
    )
    const paye = f.total_paye || 0
    return Math.max(0, Math.round((du - paye) * 100) / 100)
  }

  const columnConfigs: ColumnConfig<FactureWithClient>[] = useMemo(() => [
    { key: 'numero', getValue: (f) => f.numero, sortType: 'string' as const },
    { key: 'type', getValue: (f) => f.type === 'avoir' ? 'NC' : f.type === 'acompte' ? 'Acompte' : f.type === 'situation' ? 'Situation' : 'Facture', sortType: 'string' as const },
    { key: 'client', getValue: (f) => getClientName(f), sortType: 'string' as const },
    { key: 'reference', getValue: (f) => getFactureReference(f), sortType: 'string' as const },
    { key: 'date', getValue: (f) => f.date_facture, sortType: 'date' as const },
    { key: 'echeance', getValue: (f) => f.date_echeance || '', sortType: 'date' as const },
    { key: 'tva', getValue: (f) => (f.taux_tva_list || []).map((t) => `${t}%`).join(', '), sortType: 'string' as const },
    { key: 'montant_ttc', getValue: (f) => f.total_ttc, sortType: 'number' as const },
    { key: 'reste', getValue: (f) => getRestePayer(f), sortType: 'number' as const },
    { key: 'statut', getValue: (f) => statutConfig[f.statut]?.label || f.statut, sortType: 'string' as const },
    { key: 'vues', getValue: (f) => f.email_ouvertures || 0, sortType: 'number' as const },
  ], [])

  const { sortedAndFiltered: sortedFiltered, sortKey, sortDirection, columnFilters, toggleSort, setColumnFilter } = useTableSort(filtered, columnConfigs)

  const statutTabs = [
    'tous',
    'brouillon',
    'envoyee',
    'partiellement_payee',
    'payee',
    'en_retard',
  ] as const

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Factures</h1>
        <div className="flex items-center gap-2">
          <Link href="/rapprochement">
            <Button variant="outline" className="text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400]">
              <Landmark className="h-4 w-4 mr-2" />
              Rapprochement CODA
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setJournalOpen(true)} className="text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400]">
            <Download className="h-4 w-4 mr-2" />
            Journal des ventes
          </Button>
          <Link href="/factures/nouveau?type=avoir">
            <Button variant="outline" className="border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5">
              <FileMinus className="h-4 w-4 mr-2" />
              Note de credit
            </Button>
          </Link>
          <Link href="/factures/nouveau">
            <Button className="bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle facture
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      {canViewDashboard && <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-[#F5B400]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total factures HTVA</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMontant(stats.totalFactureHT)}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">+ TVA {formatMontant(stats.totalFactureTVA)}</p>
          <p className="text-[12px] font-semibold text-[#6B7280] tabular-nums mt-1 pt-1 border-t border-[#F3F4F6]">= {formatMontant(stats.totalFactureHT + stats.totalFactureTVA)} TTC</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Encaisse</span>
          </div>
          <p className="text-lg font-bold text-[#059669] tabular-nums">{formatMontant(stats.totalPaye)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-[#D97706]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Impaye</span>
          </div>
          <p className="text-lg font-bold text-[#D97706] tabular-nums">{formatMontant(stats.totalImpaye)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">En retard</span>
          </div>
          <p className="text-lg font-bold text-[#DC2626] tabular-nums">{stats.nbEnRetard}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Payees</span>
          </div>
          <p className="text-lg font-bold text-[#7C3AED] tabular-nums">{stats.nbPayees}</p>
        </div>
      </div>}

      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Rechercher une facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#E5E7EB] focus:border-[#F5B400] focus:ring-[#F5B400]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#9CA3AF] shrink-0" />
          <Input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="w-[140px] border-[#E5E7EB] focus:border-[#F5B400] focus:ring-[#F5B400]/20 text-sm"
            placeholder="Du"
          />
          <span className="text-[#9CA3AF] text-sm">au</span>
          <Input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-[140px] border-[#E5E7EB] focus:border-[#F5B400] focus:ring-[#F5B400]/20 text-sm"
            placeholder="Au"
          />
          <Button
            variant={dateDebut === firstOfMonth && dateFin === todayStr ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setDateDebut(firstOfMonth); setDateFin(todayStr) }}
            className={dateDebut === firstOfMonth && dateFin === todayStr ? 'bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] border-[#F5B400] text-xs px-3' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400] text-xs px-3'}
          >
            Ce mois
          </Button>
          <Button
            variant={!dateDebut && !dateFin ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setDateDebut(''); setDateFin('') }}
            className={!dateDebut && !dateFin ? 'bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] border-[#F5B400] text-xs px-3' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400] text-xs px-3'}
          >
            Tout
          </Button>
          <Button
            variant={showArchives ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setShowArchives(!showArchives); if (!showArchives) loadArchives() }}
            className={showArchives ? 'bg-[#6B7280] hover:bg-[#4B5563] text-white border-[#6B7280] text-xs px-3' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#6B7280] text-xs px-3'}
          >
            <Archive className="h-3 w-3 mr-1" />
            Archives
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {statutTabs.map((s) => (
            <Button
              key={s}
              variant={statutFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatutFilter(s)}
              className={statutFilter === s ? 'bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] border-[#F5B400]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400]'}
            >
              {s === 'tous' ? 'Tous' : (statutConfig[s]?.label || s)}
            </Button>
          ))}
        </div>
        <div className="hidden sm:block w-px h-6 bg-[#E5E7EB]" />
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: 'tous', label: 'Tous types' },
            { key: 'facture', label: 'Facture' },
            { key: 'avoir', label: 'Note de credit' },
            { key: 'acompte', label: 'Acompte' },
            { key: 'situation', label: 'Situation' },
          ] as const).map((t) => (
            <Button
              key={t.key}
              variant={typeFilter === t.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(t.key)}
              className={typeFilter === t.key ? 'bg-[#0B0B0D] hover:bg-[#111827] text-white border-[#0B0B0D]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#0B0B0D] hover:text-[#0B0B0D]'}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {sortedFiltered.length === 0 ? (
        <div className="border border-[#E5E7EB] rounded-xl bg-white w-full">
          <div className="text-center py-16 text-[#9CA3AF]">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">Aucune facture trouvee</p>
          </div>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <SortableTableHead label="Numero" columnKey="numero" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['numero'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Type" columnKey="type" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['type'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Client" columnKey="client" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['client'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Reference" columnKey="reference" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['reference'] || ''} onFilterChange={setColumnFilter} className="hidden lg:table-cell" />
                <SortableTableHead label="Date" columnKey="date" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['date'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Echeance" columnKey="echeance" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['echeance'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="TVA" columnKey="tva" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['tva'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Montant TTC" columnKey="montant_ttc" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['montant_ttc'] || ''} onFilterChange={setColumnFilter} align="right" />
                <SortableTableHead label="Reste a payer" columnKey="reste" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['reste'] || ''} onFilterChange={setColumnFilter} align="right" className="hidden md:table-cell" />
                <SortableTableHead label="Statut" columnKey="statut" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['statut'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Vues" columnKey="vues" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['vues'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((f) => {
                const restePayer = getRestePayer(f)
                return (
                  <TableRow key={f.id} className="hover:bg-[#F9FAFB]/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/factures/${f.id}`}
                          className="font-medium text-[#111827] hover:text-[#F5B400] transition-colors"
                        >
                          {f.numero}
                        </Link>
                        {f.peppol_statut === 'envoye' && (
                          <Badge className="bg-[#F5B400]/15 text-[#D89A00] border-[#F5B400]/30 text-[10px] px-1.5 py-0" title={`Envoyee via Peppol${f.peppol_sent_at ? ' le ' + new Date(f.peppol_sent_at).toLocaleDateString('fr-BE') : ''}`}>
                            Peppol
                          </Badge>
                        )}
                        {f.peppol_statut === 'echec' && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0" title={f.peppol_error || 'Echec Peppol'}>
                            Peppol ✗
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className={
                        f.type === 'avoir' ? 'bg-[#FEE2E2] text-[#DC2626]' :
                        f.type === 'acompte' ? 'bg-[#EDE9FE] text-[#7C3AED]' :
                        f.type === 'situation' ? 'bg-[#FEF3C7] text-[#D97706]' :
                        'bg-[#F3F4F6] text-[#6B7280]'
                      }>
                        {f.type === 'avoir' ? 'NC' : f.type === 'acompte' ? 'Acompte' : f.type === 'situation' ? 'Situation' : 'Facture'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#6B7280]">{getClientName(f)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-[#525252] max-w-[260px] truncate" title={getFactureReference(f)}>
                      {getFactureReference(f) || <span className="text-[#D1D5DB]">&mdash;</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-[#9CA3AF]">
                      {formatDate(f.date_facture)}
                    </TableCell>
                    <TableCell className={`hidden md:table-cell ${getEcheanceColor(f)}`}>
                      {f.date_echeance ? formatDate(f.date_echeance) : '\u2014'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(f.taux_tva_list || []).length === 0 ? (
                          <span className="text-[#D1D5DB]">&mdash;</span>
                        ) : (
                          (f.taux_tva_list || []).map((taux) => (
                            <span
                              key={taux}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${TVA_BADGE[taux] ?? 'bg-[#F3F4F6] text-[#6B7280]'}`}
                            >
                              {taux}%
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-[#111827]">
                      {formatMontant(f.total_ttc)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums hidden md:table-cell">
                      {f.statut === 'payee' ? (
                        <span className="text-[#059669]">0,00 &euro;</span>
                      ) : f.statut !== 'brouillon' ? (
                        <button
                          onClick={() => setPaiementFacture(f)}
                          className="inline-flex items-center gap-1.5 text-[#DC2626] hover:text-[#F5B400] cursor-pointer transition-colors duration-150 group"
                          title="Enregistrer un paiement"
                        >
                          <CreditCard className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {formatMontant(restePayer)}
                        </button>
                      ) : (
                        <span className="text-[#9CA3AF]">{formatMontant(f.solde_ttc)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statutConfig[f.statut]?.className || ''}>
                        {f.statut === 'envoyee' && f.nombre_envois > 1
                          ? `Renvoyee (${f.nombre_envois - 1})`
                          : (statutConfig[f.statut]?.label || f.statut)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {f.nombre_envois > 0 || f.email_ouvertures > 0 ? (() => {
                        const vues = f.email_ouvertures || 0
                        const envois = f.nombre_envois || 0
                        const lastOpenStr = f.email_derniere_ouverture
                          ? formatDate(f.email_derniere_ouverture)
                          : null
                        if (vues > 0) {
                          return (
                            <span
                              className="inline-flex items-center gap-1 text-[12px] text-emerald-700 font-medium"
                              title={lastOpenStr ? `Dernière vue le ${lastOpenStr}` : ''}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {vues}× {lastOpenStr && <span className="text-[10px] text-emerald-600 font-normal">({lastOpenStr})</span>}
                            </span>
                          )
                        }
                        return (
                          <span
                            className="inline-flex items-center gap-1 text-[12px] text-[#9CA3AF]"
                            title="Envoyée mais aucune ouverture détectée (l'email peut être lu sans charger les images)"
                          >
                            <Send className="h-3 w-3" />
                            {envois}× envoyée
                          </span>
                        )
                      })() : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-[#F3F4F6] transition-colors duration-150">
                          <MoreHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="whitespace-nowrap">
                          <DropdownMenuItem
                            onClick={() => router.push(`/factures/${f.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir / Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/api/factures/${f.id}/pdf`, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir PDF
                          </DropdownMenuItem>
                          {(f.statut === 'brouillon' || f.statut === 'envoyee') && (
                            <DropdownMenuItem
                              onClick={() => setConfirmSendId(f.id)}
                              disabled={sendingId === f.id}
                            >
                              {sendingId === f.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              {f.statut === 'envoyee' ? 'Renvoyer par email' : 'Envoyer par email'}
                            </DropdownMenuItem>
                          )}
                          {(() => {
                            const isAcompte = f.type === 'acompte'
                            const notPro = f.client?.type !== 'professionnel'
                            const disabled = isAcompte || notPro || peppolSendingId === f.id
                            const reason = isAcompte
                              ? 'Peppol : factures et avoirs uniquement (pas les acomptes)'
                              : notPro
                              ? 'Peppol : clients B2B (professionnels) uniquement'
                              : ''
                            return (
                              <DropdownMenuItem
                                onClick={() => !disabled && handleEnvoyerPeppol(f.id)}
                                disabled={disabled}
                                title={reason}
                              >
                                {peppolSendingId === f.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4 mr-2 text-[#F5B400]" />
                                )}
                                {f.peppol_statut === 'envoye' ? 'Renvoyer via Peppol' : 'Envoyer via Peppol'}
                                {reason && <span className="ml-2 text-[10px] text-muted-foreground">(B2B)</span>}
                              </DropdownMenuItem>
                            )
                          })()}
                          {f.type !== 'avoir' && (
                            <DropdownMenuItem onClick={() => handleOpenAvoir(f)}>
                              <FileMinus className="h-4 w-4 mr-2" />
                              Créer une note de crédit
                            </DropdownMenuItem>
                          )}
                          {f.statut !== 'brouillon' && f.statut !== 'payee' && (
                            <DropdownMenuItem
                              onClick={() => setPaiementFacture(f)}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Enregistrer un paiement
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Changer le statut
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {(['brouillon', 'envoyee', 'partiellement_payee', 'payee', 'en_retard'] as const).map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  disabled={f.statut === s}
                                  onClick={() => handleChangeStatut(f.id, s)}
                                >
                                  {f.statut === s && <CheckCircle2 className="h-3 w-3 mr-2 text-[#F5B400]" />}
                                  {f.statut !== s && <span className="w-3 h-3 mr-2" />}
                                  {statutConfig[s]?.label || s}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem
                            className="text-[#DC2626]"
                            onClick={() => handleArchive(f.id)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archiver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Confirmation dialog for sending */}
      <AlertDialog
        open={!!confirmSendId}
        onOpenChange={(open) => {
          if (!open) setConfirmSendId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              La facture sera envoyee par email au client avec un PDF en piece
              jointe. Le statut passera a Envoyee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmSendId && handleEnvoyer(confirmSendId)}
              disabled={!!sendingId}
              className="bg-[#F5B400] hover:bg-[#D89A00]"
            >
              {sendingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archives */}
      {showArchives && (
        <div className="mt-6 border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="bg-[#F9FAFB] px-4 py-3 flex items-center gap-2 border-b border-[#E5E7EB]">
            <Archive className="h-4 w-4 text-[#6B7280]" />
            <span className="text-[13px] font-semibold text-[#6B7280]">Factures archivées</span>
            <span className="ml-auto text-[12px] text-[#9CA3AF]">{archivedList.length} facture{archivedList.length > 1 ? 's' : ''}</span>
          </div>
          {archivedList.length === 0 ? (
            <p className="text-center text-[13px] text-[#9CA3AF] py-6">Aucune facture archivée</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-[11px] text-[#9CA3AF] uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Numéro</th>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Total TTC</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {archivedList.map((f) => (
                  <tr key={f.id} className="border-t border-[#F3F4F6]">
                    <td className="px-4 py-2 font-mono text-[12px]">{f.numero}</td>
                    <td className="px-4 py-2 text-[#374151]">{getClientName(f)}</td>
                    <td className="px-4 py-2 text-[#9CA3AF]">{formatDate(f.date_facture)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatMontant(f.total_ttc)}</td>
                    <td className="px-4 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleDesarchiver(f.id)} className="text-xs h-7">
                        Restaurer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Paiement dialog */}
      {paiementFacture && utilisateur && (
        <PaiementDialog
          open={!!paiementFacture}
          onOpenChange={(open) => {
            if (!open) setPaiementFacture(null)
          }}
          factureId={paiementFacture.id}
          entrepriseId={utilisateur.entreprise_id}
          soldeTTC={getRestePayer(paiementFacture)}
          onSuccess={refreshFactures}
        />
      )}

      {/* Note de crédit (avoir) dialog */}
      <Dialog open={!!avoirDialog} onOpenChange={(open) => { if (!open) setAvoirDialog(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-[#0A0A0B]">
              Note de crédit — {avoirDialog?.numero}
            </DialogTitle>
          </DialogHeader>

          {/* Type selector */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setAvoirType('total')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${avoirType === 'total' ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F9FAFB]'}`}
            >
              Total
            </button>
            <button
              onClick={() => setAvoirType('partiel')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${avoirType === 'partiel' ? 'bg-[#0B0B0D] text-white border-[#0B0B0D]' : 'bg-white text-[#374151] border-[#E5E7EB] hover:bg-[#F9FAFB]'}`}
            >
              Partiel
            </button>
          </div>

          {avoirType === 'total' && avoirDialog && (
            <p className="text-[13px] text-[#6B7280] bg-[#F9FAFB] rounded-lg px-4 py-3 mt-1">
              La note de crédit annulera intégralement la facture <span className="font-semibold text-[#0A0A0B]">{avoirDialog.numero}</span> pour un montant de <span className="font-semibold text-[#0A0A0B]">{formatMontant(avoirDialog.total_ht)} HT</span> ({formatMontant(avoirDialog.total_ttc)} TTC).
            </p>
          )}

          {avoirType === 'partiel' && (
            <div className="mt-1 space-y-2 max-h-64 overflow-y-auto">
              {avoirLignes.length === 0 && (
                <p className="text-[13px] text-[#9CA3AF] text-center py-4">Aucune ligne de produit sur cette facture</p>
              )}
              {avoirLignes.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
                  <input
                    type="checkbox"
                    checked={l.checked}
                    onChange={(e) => setAvoirLignes((prev) => prev.map((x, j) => j === i ? { ...x, checked: e.target.checked } : x))}
                    className="h-4 w-4 rounded accent-[#0B0B0D]"
                  />
                  <span className="flex-1 text-[13px] text-[#374151] truncate">{l.designation || '—'}</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={l.total_ht}
                      value={l.montant}
                      disabled={!l.checked}
                      onChange={(e) => setAvoirLignes((prev) => prev.map((x, j) => j === i ? { ...x, montant: parseFloat(e.target.value) || 0 } : x))}
                      className="w-28 h-7 text-[12px] text-right"
                    />
                    <span className="text-[11px] text-[#9CA3AF]">€ HT</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Totals preview */}
          {(() => {
            let totalHT = 0, totalTVA = 0
            if (avoirType === 'total' && avoirDialog) {
              totalHT = avoirDialog.total_ht
              totalTVA = avoirDialog.total_tva
            } else {
              avoirLignes.filter((l) => l.checked).forEach((l) => {
                totalHT += l.montant
                totalTVA += Math.round(l.montant * l.taux_tva) / 100
              })
            }
            const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100
            return (
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Total HT</span><span>{formatMontant(Math.round(totalHT * 100) / 100)}</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>TVA</span><span>{formatMontant(Math.round(totalTVA * 100) / 100)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[#0A0A0B]">
                  <span>Total TTC</span><span>{formatMontant(totalTTC)}</span>
                </div>
              </div>
            )
          })()}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAvoirDialog(null)} disabled={avoirLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateAvoir}
              disabled={avoirLoading || (avoirType === 'partiel' && avoirLignes.filter((l) => l.checked && l.montant > 0).length === 0)}
              className="bg-[#0B0B0D] hover:bg-[#1F1F23] text-white"
            >
              {avoirLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileMinus className="h-4 w-4 mr-2" />}
              Créer la note de crédit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={journalOpen} onOpenChange={setJournalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold text-[#0A0A0B]">Journal des ventes — export Excel</DialogTitle>
          </DialogHeader>
          <p className="text-[12px] text-[#9CA3AF]">Export des factures de vente sur la période (aide à la saisie comptable).</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Du</Label>
              <Input type="date" value={jDebut} onChange={(e) => setJDebut(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Au</Label>
              <Input type="date" value={jFin} onChange={(e) => setJFin(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setJournalOpen(false)}>Annuler</Button>
            <Button
              onClick={() => { window.open(`/api/factures/journal-ventes?debut=${jDebut}&fin=${jFin}`, '_blank'); setJournalOpen(false) }}
              className="bg-[#0B0B0D] hover:bg-[#1F1F23] text-white"
            >
              <Download className="h-4 w-4 mr-2" /> Télécharger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
