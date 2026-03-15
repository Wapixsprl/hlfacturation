'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { FactureAchat } from '@/types/database'
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
import { useTableSort, type ColumnConfig } from '@/lib/hooks/useTableSort'
import { SortableTableHead } from '@/components/shared/SortableTableHead'
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
  ShoppingCart,
  Download,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMontant, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type FactureAchatWithFournisseur = FactureAchat & {
  fournisseur: { raison_sociale: string; contact_nom: string | null } | null
}

interface Props {
  initialFactures: FactureAchatWithFournisseur[]
}

const STATUT_LABELS: Record<string, string> = {
  a_payer: 'A payer',
  partiellement_paye: 'Partiel',
  paye: 'Paye',
  en_retard: 'En retard',
}

const STATUT_COLORS: Record<string, string> = {
  a_payer: 'bg-[#FEF3C7] text-[#D97706]',
  partiellement_paye: 'bg-[#FFEDD5] text-[#EA580C]',
  paye: 'bg-[#D1FAE5] text-[#059669]',
  en_retard: 'bg-[#FEE2E2] text-[#DC2626]',
}

const CATEGORIE_LABELS: Record<string, string> = {
  materiaux: 'Materiaux',
  sous_traitance: 'Sous-traitance',
  carburant: 'Carburant',
  assurance: 'Assurance',
  outillage: 'Outillage',
  telecom: 'Telecom',
  autre: 'Autre',
}

type StatutFilter = 'tous' | 'a_payer' | 'partiellement_paye' | 'paye' | 'en_retard'

export function FacturesAchatPageContent({ initialFactures }: Props) {
  const [factures, setFactures] = useState(initialFactures)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const supabase = createClient()

  const filtered = factures.filter((f) => {
    const searchLower = search.toLowerCase()
    const matchSearch =
      search === '' ||
      (f.numero_fournisseur || '').toLowerCase().includes(searchLower) ||
      (f.fournisseur?.raison_sociale || '').toLowerCase().includes(searchLower) ||
      (f.fournisseur?.contact_nom || '').toLowerCase().includes(searchLower)
    const matchStatut = statutFilter === 'tous' || f.statut === statutFilter
    const matchDateDebut = !dateDebut || f.date_facture >= dateDebut
    const matchDateFin = !dateFin || f.date_facture <= dateFin
    return matchSearch && matchStatut && matchDateDebut && matchDateFin
  })

  const columnConfigs: ColumnConfig<FactureAchatWithFournisseur>[] = useMemo(() => [
    { key: 'numero', getValue: (f) => f.numero_fournisseur || '', sortType: 'string' as const },
    { key: 'fournisseur', getValue: (f) => f.fournisseur?.raison_sociale || '', sortType: 'string' as const },
    { key: 'designation', getValue: (f) => f.designation || '', sortType: 'string' as const },
    { key: 'categorie', getValue: (f) => CATEGORIE_LABELS[f.categorie] || f.categorie, sortType: 'string' as const },
    { key: 'date', getValue: (f) => f.date_facture, sortType: 'date' as const },
    { key: 'montant_ttc', getValue: (f) => f.total_ttc, sortType: 'number' as const },
    { key: 'statut', getValue: (f) => STATUT_LABELS[f.statut] || f.statut, sortType: 'string' as const },
  ], [])

  const { sortedAndFiltered: sortedFiltered, sortKey, sortDirection, columnFilters, toggleSort, setColumnFilter } = useTableSort(filtered, columnConfigs)

  // Statistics computed on filtered results
  const stats = useMemo(() => {
    const totalDepenses = filtered.reduce((sum, f) => sum + f.total_ttc, 0)
    const totalPaye = filtered
      .filter((f) => f.statut === 'paye')
      .reduce((sum, f) => sum + f.total_ttc, 0)
    const totalAPayer = filtered
      .filter((f) => f.statut === 'a_payer' || f.statut === 'partiellement_paye' || f.statut === 'en_retard')
      .reduce((sum, f) => sum + f.total_ttc, 0)
    const nbEnRetard = filtered.filter((f) => f.statut === 'en_retard').length

    // Top categorie
    const catMap: Record<string, number> = {}
    for (const f of filtered) {
      const cat = f.categorie || 'autre'
      catMap[cat] = (catMap[cat] || 0) + f.total_ttc
    }
    const topCategorie = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

    return { totalDepenses, totalPaye, totalAPayer, nbEnRetard, topCategorie }
  }, [filtered])

  const refreshFactures = async () => {
    const { data } = await supabase
      .from('factures_achat')
      .select('*, fournisseur:fournisseurs(raison_sociale, contact_nom)')
      .is('archived_at', null)
      .order('date_facture', { ascending: false })
    if (data) setFactures(data as FactureAchatWithFournisseur[])
  }

  const handleDownloadFile = async (filePath: string) => {
    if (filePath.startsWith('http')) {
      window.open(filePath, '_blank')
      return
    }
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUrl(filePath, 60 * 60)
    if (error || !data?.signedUrl) {
      toast.error('Erreur lors du telechargement')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('factures_achat')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error("Erreur lors de l'archivage")
    } else {
      toast.success('Facture archivee')
      refreshFactures()
    }
  }

  const statutTabs: { key: StatutFilter; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'a_payer', label: 'A payer' },
    { key: 'partiellement_paye', label: 'Partiel' },
    { key: 'paye', label: 'Paye' },
    { key: 'en_retard', label: 'En retard' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Factures d&apos;achat</h1>
        <Link href="/factures-achat/nouveau">
          <Button className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle facture
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total depenses</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMontant(stats.totalDepenses)}</p>
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
            <Clock className="h-4 w-4 text-[#D97706]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">A payer</span>
          </div>
          <p className="text-lg font-bold text-[#D97706] tabular-nums">{formatMontant(stats.totalAPayer)}</p>
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
            <ShoppingCart className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Top categorie</span>
          </div>
          <p className="text-lg font-bold text-[#7C3AED] tabular-nums">
            {stats.topCategorie ? CATEGORIE_LABELS[stats.topCategorie[0]] || stats.topCategorie[0] : '\u2014'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Rechercher par n° fournisseur ou nom..."
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
          />
          <span className="text-[#9CA3AF] text-sm">au</span>
          <Input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-[140px] border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20 text-sm"
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

      <div className="flex gap-1.5 flex-wrap mb-4">
        {statutTabs.map((t) => (
          <Button
            key={t.key}
            variant={statutFilter === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatutFilter(t.key)}
            className={statutFilter === t.key ? 'bg-[#17C2D7] hover:bg-[#14a8bc] text-white border-[#17C2D7]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#17C2D7] hover:text-[#17C2D7]'}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {sortedFiltered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucune facture d&apos;achat trouvee</p>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <SortableTableHead label="N° Fournisseur" columnKey="numero" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['numero'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Fournisseur" columnKey="fournisseur" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['fournisseur'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Designation" columnKey="designation" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['designation'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Categorie" columnKey="categorie" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['categorie'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Date" columnKey="date" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['date'] || ''} onFilterChange={setColumnFilter} />
                <SortableTableHead label="Montant TTC" columnKey="montant_ttc" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['montant_ttc'] || ''} onFilterChange={setColumnFilter} align="right" />
                <SortableTableHead label="Statut" columnKey="statut" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['statut'] || ''} onFilterChange={setColumnFilter} />
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((facture) => (
                <TableRow key={facture.id} className="hover:bg-[#F9FAFB]/50">
                  <TableCell className="font-medium text-[#111827]">
                    {facture.numero_fournisseur || '\u2014'}
                  </TableCell>
                  <TableCell className="text-[#6B7280]">
                    {facture.fournisseur?.raison_sociale || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[#6B7280] max-w-[200px] truncate">
                    {facture.designation || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="bg-[#17C2D7]/10 text-[#17C2D7]">
                      {CATEGORIE_LABELS[facture.categorie] || facture.categorie}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#9CA3AF]">{formatDate(facture.date_facture)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-[#111827]">
                    {formatMontant(facture.total_ttc)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUT_COLORS[facture.statut] || ''}>
                      {STATUT_LABELS[facture.statut] || facture.statut}
                    </Badge>
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
                          }}
                        >
                          <Link
                            href={`/factures-achat/${facture.id}`}
                            className="flex items-center w-full"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Voir / Modifier
                          </Link>
                        </DropdownMenuItem>
                        {facture.fichier_url && (
                          <DropdownMenuItem
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              handleDownloadFile(facture.fichier_url!)
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Telecharger fichier
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-[#DC2626]"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            handleArchive(facture.id)
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
    </div>
  )
}
