'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/types/database'
import { formatDate, formatMontant } from '@/lib/utils'
import { useTableSort, type ColumnConfig } from '@/lib/hooks/useTableSort'
import { SortableTableHead } from '@/components/shared/SortableTableHead'
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
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Archive,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ClientDialog } from './ClientDialog'

type ClientWithStats = Client & {
  dernier_devis_accepte?: string | null
  dernier_devis_envoye?: string | null
  ca_total: number
  total_paye: number
  total_en_souffrance: number
}

interface Props {
  initialClients: ClientWithStats[]
}

export function ClientsPageContent({ initialClients }: Props) {
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'tous' | 'particulier' | 'professionnel'>('tous')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const filtered = useMemo(() => clients.filter((c) => {
    const matchSearch = [c.nom, c.prenom, c.raison_sociale, c.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchType = typeFilter === 'tous' || c.type === typeFilter
    return matchSearch && matchType
  }), [clients, search, typeFilter])

  // Statistics
  const stats = useMemo(() => {
    const totalClients = filtered.length
    const nbPro = filtered.filter((c) => c.type === 'professionnel').length
    const caTotal = filtered.reduce((sum, c) => sum + c.ca_total, 0)
    const totalPaye = filtered.reduce((sum, c) => sum + c.total_paye, 0)
    const totalEnSouffrance = filtered.reduce((sum, c) => sum + c.total_en_souffrance, 0)
    return { totalClients, nbPro, caTotal, totalPaye, totalEnSouffrance }
  }, [filtered])

  const refreshClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (data) {
      // Preserve financial stats from initial data
      const statsMap: Record<string, { ca_total: number; total_paye: number; total_en_souffrance: number }> = {}
      for (const c of clients) {
        statsMap[c.id] = { ca_total: c.ca_total, total_paye: c.total_paye, total_en_souffrance: c.total_en_souffrance }
      }
      setClients(
        data.map((c) => ({
          ...c,
          ca_total: statsMap[c.id]?.ca_total || 0,
          total_paye: statsMap[c.id]?.total_paye || 0,
          total_en_souffrance: statsMap[c.id]?.total_en_souffrance || 0,
        }))
      )
    }
  }

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error("Erreur lors de l'archivage")
    } else {
      toast.success('Client archive')
      refreshClients()
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditingClient(null)
    setDialogOpen(true)
  }

  const displayName = (c: Client) => {
    if (c.type === 'professionnel' && c.raison_sociale) return c.raison_sociale
    return [c.prenom, c.nom].filter(Boolean).join(' ') || '\u2014'
  }

  type ClientRow = ClientWithStats

  const columnConfigs: ColumnConfig<ClientRow>[] = useMemo(() => [
    { key: 'nom', getValue: (c) => displayName(c), sortType: 'string' as const },
    { key: 'type', getValue: (c) => c.type || '', sortType: 'string' as const },
    { key: 'email', getValue: (c) => c.email || '', sortType: 'string' as const },
    { key: 'telephone', getValue: (c) => c.telephone || '', sortType: 'string' as const },
    { key: 'ville', getValue: (c) => c.ville || '', sortType: 'string' as const },
    { key: 'ca', getValue: (c) => c.ca_total, sortType: 'number' as const },
    { key: 'souffrance', getValue: (c) => c.total_en_souffrance, sortType: 'number' as const },
  ], [])

  const { sortedAndFiltered: sortedFiltered, sortKey, sortDirection, columnFilters, toggleSort, setColumnFilter } = useTableSort(filtered, columnConfigs)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Clients</h1>
        <Button onClick={handleNew} className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total clients</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{stats.totalClients}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Professionnels</span>
          </div>
          <p className="text-lg font-bold text-[#7C3AED] tabular-nums">{stats.nbPro}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">CA total</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMontant(stats.caTotal)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Paye</span>
          </div>
          <p className="text-lg font-bold text-[#059669] tabular-nums">{formatMontant(stats.totalPaye)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">En souffrance</span>
          </div>
          <p className="text-lg font-bold text-[#DC2626] tabular-nums">{formatMontant(stats.totalEnSouffrance)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20"
          />
        </div>
        <div className="flex gap-1.5">
          {(['tous', 'particulier', 'professionnel'] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(t)}
              className={typeFilter === t ? 'bg-[#17C2D7] hover:bg-[#14a8bc] text-white border-[#17C2D7]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#17C2D7] hover:text-[#17C2D7]'}
            >
              {t === 'tous' ? 'Tous' : t === 'particulier' ? 'Particuliers' : 'Professionnels'}
            </Button>
          ))}
        </div>
      </div>

      {sortedFiltered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucun client trouve</p>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <SortableTableHead
                  label="Nom / Raison sociale"
                  columnKey="nom"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  filterValue={columnFilters['nom'] || ''}
                  onFilterChange={setColumnFilter}
                />
                <SortableTableHead
                  label="Type"
                  columnKey="type"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  filterValue={columnFilters['type'] || ''}
                  onFilterChange={setColumnFilter}
                />
                <SortableTableHead
                  label="Email"
                  columnKey="email"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  filterValue={columnFilters['email'] || ''}
                  onFilterChange={setColumnFilter}
                  className="hidden md:table-cell"
                />
                <SortableTableHead
                  label="Telephone"
                  columnKey="telephone"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  filterValue={columnFilters['telephone'] || ''}
                  onFilterChange={setColumnFilter}
                  className="hidden md:table-cell"
                />
                <SortableTableHead
                  label="Ville"
                  columnKey="ville"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  filterValue={columnFilters['ville'] || ''}
                  onFilterChange={setColumnFilter}
                  className="hidden lg:table-cell"
                />
                <SortableTableHead
                  label="CA"
                  columnKey="ca"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  filterValue={columnFilters['ca'] || ''}
                  onFilterChange={setColumnFilter}
                  align="right"
                />
                <SortableTableHead
                  label="En souffrance"
                  columnKey="souffrance"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onToggleSort={toggleSort}
                  filterValue={columnFilters['souffrance'] || ''}
                  onFilterChange={setColumnFilter}
                  className="hidden lg:table-cell"
                  align="right"
                />
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-[#F9FAFB]/50"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell className="font-medium text-[#111827]">{displayName(client)}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        client.type === 'professionnel'
                          ? 'bg-[#1E2028] text-white'
                          : 'bg-[#17C2D7]/10 text-[#17C2D7]'
                      }
                    >
                      {client.type === 'professionnel' ? 'Pro' : 'Particulier'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[#6B7280]">{client.email || '\u2014'}</TableCell>
                  <TableCell className="hidden md:table-cell text-[#6B7280]">{client.telephone || '\u2014'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-[#9CA3AF]">{client.ville || '\u2014'}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-[#111827]">
                    {client.ca_total > 0 ? formatMontant(client.ca_total) : '\u2014'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right tabular-nums">
                    {client.total_en_souffrance > 0 ? (
                      <span className="text-[#DC2626] font-medium">{formatMontant(client.total_en_souffrance)}</span>
                    ) : (
                      <span className="text-[#9CA3AF]">{'\u2014'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-[#F3F4F6] transition-colors duration-150"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="whitespace-nowrap">
                        <DropdownMenuItem
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            handleEdit(client)
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[#DC2626]"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            handleArchive(client.id)
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editingClient}
        onSuccess={refreshClients}
      />
    </div>
  )
}
