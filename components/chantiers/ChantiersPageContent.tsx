'use client'

import { useState, useMemo } from 'react'
import { useTableSort, type ColumnConfig } from '@/lib/hooks/useTableSort'
import { SortableTableHead } from '@/components/shared/SortableTableHead'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Chantier, Client, Equipe, Devis } from '@/types/database'
import { formatDate } from '@/lib/utils'
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
  HardHat,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Archive,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const statutConfig: Record<string, { label: string; className: string }> = {
  a_planifier: { label: 'A planifier', className: 'bg-amber-100 text-amber-700' },
  planifie: { label: 'Planifie', className: 'bg-blue-100 text-blue-700' },
  en_cours: { label: 'En cours', className: 'bg-emerald-100 text-emerald-700' },
  termine: { label: 'Termine', className: 'bg-slate-100 text-slate-600' },
  livre: { label: 'Livre', className: 'bg-purple-100 text-purple-700' },
}

const prioriteConfig: Record<string, { label: string; className: string } | null> = {
  basse: { label: 'Basse', className: 'text-slate-500 bg-transparent' },
  normale: null,
  haute: { label: 'Haute', className: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700' },
}

type ChantierWithRelations = Chantier & {
  client: Pick<Client, 'id' | 'nom' | 'prenom' | 'raison_sociale' | 'type'> | null
  equipe: Pick<Equipe, 'id' | 'nom' | 'couleur'> | null
  devis: Pick<Devis, 'id' | 'numero' | 'total_ht'> | null
}

interface Props {
  initialChantiers: ChantierWithRelations[]
  equipes: Pick<Equipe, 'id' | 'nom' | 'couleur'>[]
}

export function ChantiersPageContent({ initialChantiers, equipes }: Props) {
  const [chantiersList, setChantiersList] = useState(initialChantiers)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('tous')
  const router = useRouter()
  const supabase = createClient()

  const getClientName = (c: ChantierWithRelations): string => {
    if (!c.client) return '\u2014'
    if (c.client.type === 'professionnel' && c.client.raison_sociale) {
      return c.client.raison_sociale
    }
    return [c.client.prenom, c.client.nom].filter(Boolean).join(' ') || '\u2014'
  }

  const columnConfigs: ColumnConfig<ChantierWithRelations>[] = useMemo(() => [
    { key: 'numero', getValue: (c) => c.numero, sortType: 'string' as const },
    { key: 'client', getValue: (c) => getClientName(c), sortType: 'string' as const },
    { key: 'titre', getValue: (c) => c.titre || '', sortType: 'string' as const },
    { key: 'equipe', getValue: (c) => c.equipe?.nom || '', sortType: 'string' as const },
    { key: 'date_debut', getValue: (c) => c.date_debut, sortType: 'date' as const },
    { key: 'statut', getValue: (c) => statutConfig[c.statut]?.label || c.statut, sortType: 'string' as const },
    { key: 'priorite', getValue: (c) => c.priorite, sortType: 'string' as const },
  ], [])

  const filtered = chantiersList.filter((c) => {
    const clientName = getClientName(c)
    const matchSearch = [c.numero, c.titre, clientName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchStatut = statutFilter === 'tous' || c.statut === statutFilter
    return matchSearch && matchStatut
  })

  const { sortedAndFiltered: sortedFiltered, sortKey, sortDirection, columnFilters, toggleSort, setColumnFilter } = useTableSort(filtered, columnConfigs)

  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.substring(0, 7)

  const stats = useMemo(() => {
    const aPlanifier = chantiersList.filter((c) => c.statut === 'a_planifier').length
    const enCours = chantiersList.filter((c) => c.statut === 'en_cours').length
    const enRetard = chantiersList.filter((c) =>
      c.date_fin_prevue &&
      c.date_fin_prevue < today &&
      c.statut !== 'termine' &&
      c.statut !== 'livre'
    ).length
    const terminesCeMois = chantiersList.filter((c) =>
      c.statut === 'termine' &&
      c.date_fin_reelle &&
      c.date_fin_reelle.substring(0, 7) === currentMonth
    ).length

    return { aPlanifier, enCours, enRetard, terminesCeMois }
  }, [chantiersList, today, currentMonth])

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('chantiers')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error("Erreur lors de l'archivage")
    } else {
      toast.success('Chantier archive')
      setChantiersList((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const statutTabs = ['tous', 'a_planifier', 'planifie', 'en_cours', 'termine', 'livre'] as const

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Chantiers</h1>
        <Link href="/chantiers/nouveau">
          <Button className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau chantier
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-amber-500" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">A planifier</span>
          </div>
          <p className="text-lg font-bold text-amber-600 tabular-nums">{stats.aPlanifier}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">En cours</span>
          </div>
          <p className="text-lg font-bold text-emerald-600 tabular-nums">{stats.enCours}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">En retard</span>
          </div>
          <p className="text-lg font-bold text-[#DC2626] tabular-nums">{stats.enRetard}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Termines ce mois</span>
          </div>
          <p className="text-lg font-bold text-[#059669] tabular-nums">{stats.terminesCeMois}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Rechercher un chantier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
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

      {/* Table */}
      {sortedFiltered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <HardHat className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucun chantier trouve</p>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <SortableTableHead label="Numero" columnKey="numero" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['numero'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Client" columnKey="client" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['client'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Titre" columnKey="titre" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['titre'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Equipe" columnKey="equipe" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['equipe'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Debut" columnKey="date_debut" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['date_debut'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Statut" columnKey="statut" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['statut'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Priorite" columnKey="priorite" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['priorite'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((c) => (
                <TableRow key={c.id} className="hover:bg-[#F9FAFB]/50">
                  <TableCell>
                    <Link
                      href={`/chantiers/${c.id}`}
                      className="text-[13px] font-medium text-[#111827] hover:text-[#17C2D7] transition-colors"
                    >
                      {c.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#6B7280]">{getClientName(c)}</TableCell>
                  <TableCell className="hidden md:table-cell text-[#9CA3AF]">
                    {c.titre || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {c.equipe ? (
                      <Badge
                        className="text-[12px] font-medium"
                        style={{
                          backgroundColor: c.equipe.couleur + '20',
                          color: c.equipe.couleur,
                          borderColor: c.equipe.couleur + '40',
                        }}
                      >
                        {c.equipe.nom}
                      </Badge>
                    ) : (
                      <span className="text-[#9CA3AF]">{'\u2014'}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[#9CA3AF]">
                    {c.date_debut ? formatDate(c.date_debut) : '\u2014'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statutConfig[c.statut]?.className || ''}>
                      {statutConfig[c.statut]?.label || c.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {prioriteConfig[c.priorite] ? (
                      <Badge className={prioriteConfig[c.priorite]!.className}>
                        {prioriteConfig[c.priorite]!.label}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-[#F3F4F6] transition-colors duration-150">
                        <MoreHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="whitespace-nowrap">
                        <DropdownMenuItem
                          onClick={() => router.push(`/chantiers/${c.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir / Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[#DC2626]"
                          onClick={() => handleArchive(c.id)}
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
    </div>
  )
}
