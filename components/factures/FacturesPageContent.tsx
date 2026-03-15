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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUser } from '@/lib/hooks/useUser'
import { PaiementDialog } from './PaiementDialog'

const statutConfig: Record<string, { label: string; className: string }> = {
  brouillon: {
    label: 'Brouillon',
    className: 'bg-[#F3F4F6] text-[#6B7280]',
  },
  envoyee: {
    label: 'Envoyee',
    className: 'bg-[#17C2D7]/10 text-[#17C2D7]',
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
  total_paye?: number
}

interface Props {
  initialFactures: FactureWithClient[]
}

export function FacturesPageContent({ initialFactures }: Props) {
  const [facturesList, setFacturesList] = useState(initialFactures)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('tous')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null)
  const [paiementFacture, setPaiementFacture] = useState<FactureWithClient | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { utilisateur } = useUser()

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
    const matchSearch = [f.numero, clientName]
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

  // Statistics computed on filtered results
  const stats = useMemo(() => {
    const totalFacture = filtered.reduce((sum, f) => sum + f.total_ttc, 0)
    const totalPaye = filtered.reduce((sum, f) => {
      if (f.statut === 'payee') return sum + f.total_ttc
      return sum + (f.total_paye || 0)
    }, 0)
    const totalImpaye = filtered.reduce((sum, f) => {
      if (f.statut === 'payee' || f.statut === 'brouillon') return sum
      const paye = f.total_paye || 0
      return sum + Math.max(0, f.solde_ttc - paye)
    }, 0)
    const nbEnRetard = filtered.filter((f) => f.statut === 'en_retard').length
    const nbPayees = filtered.filter((f) => f.statut === 'payee').length

    return { totalFacture, totalPaye, totalImpaye, nbEnRetard, nbPayees }
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
    }
    setSendingId(null)
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

  const refreshFactures = async () => {
    const { data } = await supabase
      .from('factures')
      .select('*, client:clients(nom, prenom, raison_sociale, type)')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (data) {
      const ids = data.map((f: FactureWithClient) => f.id)
      if (ids.length > 0) {
        const { data: paiements } = await supabase
          .from('paiements_clients')
          .select('facture_id, montant')
          .in('facture_id', ids)
        const paiementMap: Record<string, number> = {}
        for (const p of paiements || []) {
          paiementMap[p.facture_id] = (paiementMap[p.facture_id] || 0) + p.montant
        }
        setFacturesList(data.map((f: FactureWithClient) => ({ ...f, total_paye: paiementMap[f.id] || 0 })))
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
    const paye = f.total_paye || 0
    return Math.max(0, Math.round((f.solde_ttc - paye) * 100) / 100)
  }

  const columnConfigs: ColumnConfig<FactureWithClient>[] = useMemo(() => [
    { key: 'numero', getValue: (f) => f.numero, sortType: 'string' as const },
    { key: 'type', getValue: (f) => f.type === 'avoir' ? 'NC' : f.type === 'acompte' ? 'Acompte' : f.type === 'situation' ? 'Situation' : 'Facture', sortType: 'string' as const },
    { key: 'client', getValue: (f) => getClientName(f), sortType: 'string' as const },
    { key: 'date', getValue: (f) => f.date_facture, sortType: 'date' as const },
    { key: 'echeance', getValue: (f) => f.date_echeance || '', sortType: 'date' as const },
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
          <Link href="/factures/nouveau?type=avoir">
            <Button variant="outline" className="border-[#DC2626] text-[#DC2626] hover:bg-[#DC2626]/5">
              <FileMinus className="h-4 w-4 mr-2" />
              Note de credit
            </Button>
          </Link>
          <Link href="/factures/nouveau">
            <Button className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle facture
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total facture</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMontant(stats.totalFacture)}</p>
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
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Rechercher une facture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#9CA3AF] shrink-0" />
          <Input
            type="date"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            className="w-[140px] border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20 text-sm"
            placeholder="Du"
          />
          <span className="text-[#9CA3AF] text-sm">au</span>
          <Input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-[140px] border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20 text-sm"
            placeholder="Au"
          />
          {(dateDebut || dateFin) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDateDebut(''); setDateFin('') }}
              className="text-[#9CA3AF] hover:text-[#111827] px-2"
            >
              Effacer
            </Button>
          )}
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
              className={statutFilter === s ? 'bg-[#17C2D7] hover:bg-[#14a8bc] text-white border-[#17C2D7]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#17C2D7] hover:text-[#17C2D7]'}
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
              className={typeFilter === t.key ? 'bg-[#1E2028] hover:bg-[#111827] text-white border-[#1E2028]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#1E2028] hover:text-[#1E2028]'}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {sortedFiltered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucune facture trouvee</p>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <SortableTableHead label="Numero" columnKey="numero" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['numero'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Type" columnKey="type" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['type'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Client" columnKey="client" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['client'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Date" columnKey="date" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['date'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Echeance" columnKey="echeance" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['echeance'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
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
                      <Link
                        href={`/factures/${f.id}`}
                        className="font-medium text-[#111827] hover:text-[#17C2D7] transition-colors"
                      >
                        {f.numero}
                      </Link>
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
                    <TableCell className="hidden md:table-cell text-[#9CA3AF]">
                      {formatDate(f.date_facture)}
                    </TableCell>
                    <TableCell className={`hidden md:table-cell ${getEcheanceColor(f)}`}>
                      {f.date_echeance ? formatDate(f.date_echeance) : '\u2014'}
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
                          className="inline-flex items-center gap-1.5 text-[#DC2626] hover:text-[#17C2D7] cursor-pointer transition-colors duration-150 group"
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
                      {f.statut !== 'brouillon' ? (
                        <span className="inline-flex items-center gap-1 text-[13px] text-[#9CA3AF]">
                          <Eye className="h-3.5 w-3.5" />
                          {f.email_ouvertures || 0}
                        </span>
                      ) : null}
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
                            <Download className="h-4 w-4 mr-2" />
                            Telecharger PDF
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
                              {f.statut === 'envoyee' ? 'Renvoyer' : 'Envoyer'}
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
              className="bg-[#17C2D7] hover:bg-[#14a8bc]"
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
    </div>
  )
}
