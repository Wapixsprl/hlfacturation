'use client'

import { useState, useMemo, useEffect } from 'react'
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
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
  Paperclip,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMontant, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type FactureAchatWithFournisseur = FactureAchat & {
  fournisseur: { raison_sociale: string; contact_nom: string | null } | null
  prochaine_echeance?: string | null
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
  const [showArchived, setShowArchived] = useState(false)
  const today = new Date()
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const firstOfYear = `${today.getFullYear()}-01-01`
  const todayStr = today.toISOString().split('T')[0]
  // Filtre par defaut : annee en cours (les factures fournisseurs ont souvent
  // une date du mois precedent, donc filtrer par mois est trop restrictif).
  const [dateDebut, setDateDebut] = useState(firstOfYear)
  const [dateFin, setDateFin] = useState(todayStr)
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
    { key: 'echeance', getValue: (f) => f.prochaine_echeance || '', sortType: 'date' as const },
    { key: 'montant_ttc', getValue: (f) => f.total_ttc, sortType: 'number' as const },
    { key: 'statut', getValue: (f) => STATUT_LABELS[f.statut] || f.statut, sortType: 'string' as const },
  ], [])

  const { sortedAndFiltered: sortedFiltered, sortKey, sortDirection, columnFilters, toggleSort, setColumnFilter } = useTableSort(filtered, columnConfigs)

  // Statistics computed on filtered results
  // Note de credit = montant deduit (signe negatif) du total depenses
  const signedTotalTTC = (f: FactureAchatWithFournisseur) =>
    f.type === 'note_credit' ? -Math.abs(Number(f.total_ttc)) : Number(f.total_ttc)
  const signedTotalHT = (f: FactureAchatWithFournisseur) =>
    f.type === 'note_credit' ? -Math.abs(Number(f.total_ht)) : Number(f.total_ht)
  const signedTotalTVA = (f: FactureAchatWithFournisseur) =>
    f.type === 'note_credit' ? -Math.abs(Number(f.total_tva)) : Number(f.total_tva)
  const stats = useMemo(() => {
    const totalDepensesHT = filtered.reduce((sum, f) => sum + signedTotalHT(f), 0)
    const totalDepensesTVA = filtered.reduce((sum, f) => sum + signedTotalTVA(f), 0)
    // Paye et a payer restent en TTC (tresorerie)
    const totalPaye = filtered
      .filter((f) => f.statut === 'paye')
      .reduce((sum, f) => sum + signedTotalTTC(f), 0)
    const totalAPayer = filtered
      .filter((f) => f.statut === 'a_payer' || f.statut === 'partiellement_paye' || f.statut === 'en_retard')
      .reduce((sum, f) => sum + signedTotalTTC(f), 0)
    const nbEnRetard = filtered.filter((f) => f.statut === 'en_retard').length

    // Top categorie (uniquement les factures, pas les NC, en HT)
    const catMap: Record<string, number> = {}
    for (const f of filtered) {
      if (f.type === 'note_credit') continue
      const cat = f.categorie || 'autre'
      catMap[cat] = (catMap[cat] || 0) + Number(f.total_ht)
    }
    const topCategorie = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

    return { totalDepensesHT, totalDepensesTVA, totalPaye, totalAPayer, nbEnRetard, topCategorie }
  }, [filtered])

  const refreshFactures = async (includeArchived = showArchived) => {
    const query = supabase
      .from('factures_achat')
      .select('*, fournisseur:fournisseurs(raison_sociale, contact_nom), echeances:echeances_fournisseurs(date_echeance, montant, statut)')
      .order('date_facture', { ascending: false })
    const { data } = includeArchived
      ? await query.not('archived_at', 'is', null)
      : await query.is('archived_at', null)
    if (data) {
      const enriched = data.map((f) => {
        const echeances = (f.echeances as Array<{ date_echeance: string; statut: string }> | null) || []
        const nonPayees = echeances.filter((e) => e.statut !== 'paye')
        const prochaine = nonPayees.length > 0
          ? nonPayees.map((e) => e.date_echeance).sort()[0]
          : null
        return { ...f, prochaine_echeance: prochaine }
      })
      setFactures(enriched as FactureAchatWithFournisseur[])
    }
  }

  // Re-charge la liste quand on bascule entre actives / archivees
  useEffect(() => {
    refreshFactures(showArchived)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived])

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from('factures_achat')
      .update({ archived_at: null })
      .eq('id', id)
    if (error) {
      toast.error('Erreur lors de la restauration')
    } else {
      toast.success('Facture restauree')
      setFactures((prev) => prev.filter((f) => f.id !== id))
    }
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

  const handleChangeStatut = async (
    id: string,
    newStatut: 'a_payer' | 'partiellement_paye' | 'paye' | 'en_retard'
  ) => {
    const { error } = await supabase
      .from('factures_achat')
      .update({ statut: newStatut, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Erreur lors du changement de statut')
    } else {
      toast.success('Statut mis a jour')
      setFactures((prev) =>
        prev.map((f) => (f.id === id ? { ...f, statut: newStatut } : f))
      )
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const toastId = toast.loading('Synchronisation Peppol...')
              try {
                const res = await fetch('/api/peppol/inbox/sync', { method: 'POST' })
                // On lit le body brut puis on parse, pour pouvoir afficher
                // une 500 HTML/text en clair au lieu d'un mysterieux "Erreur reseau"
                const raw = await res.text()
                let data: { error?: string; imported?: number; skipped?: number; errors?: string[]; provider?: string } = {}
                try { data = raw ? JSON.parse(raw) : {} } catch { /* HTML/text */ }

                if (!res.ok) {
                  const detail = data.error || (raw ? raw.slice(0, 200) : `HTTP ${res.status}`)
                  toast.error(detail, { id: toastId, duration: 10000 })
                  return
                }
                if ((data.imported ?? 0) > 0) {
                  toast.success(`${data.imported} facture(s) importee(s) depuis Peppol`, { id: toastId })
                  refreshFactures()
                } else if (data.errors && data.errors.length > 0) {
                  toast.error(`Erreurs Peppol : ${data.errors.slice(0, 2).join(' | ')}`, { id: toastId, duration: 12000 })
                } else {
                  const providerLabel = data.provider === 'letspeppol' ? "Let's Peppol" : 'e-invoice.be'
                  toast.success(`Aucune nouvelle facture Peppol (${providerLabel}, ${data.skipped ?? 0} deja importee(s))`, { id: toastId })
                }
              } catch (e) {
                toast.error('Erreur reseau : ' + (e instanceof Error ? e.message : 'inconnue'), {
                  id: toastId, duration: 10000,
                })
              }
            }}
            className="text-[#F5B400] border-[#F5B400]/30 hover:bg-[#F5B400]/10 hover:text-[#F5B400]"
            title="Synchroniser la boite de reception Peppol (e-invoice.be)"
          >
            <Download className="h-4 w-4 mr-2" />
            Synchroniser Peppol
          </Button>
          <Link href="/factures-achat/nouveau">
            <Button className="bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] shadow-sm">
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
            <TrendingUp className="h-4 w-4 text-[#F5B400]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total dépenses HTVA</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMontant(stats.totalDepensesHT)}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">+ TVA {formatMontant(stats.totalDepensesTVA)}</p>
          <p className="text-[12px] font-semibold text-[#6B7280] tabular-nums mt-1 pt-1 border-t border-[#F3F4F6]">= {formatMontant(stats.totalDepensesHT + stats.totalDepensesTVA)} TTC</p>
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
          />
          <span className="text-[#9CA3AF] text-sm">au</span>
          <Input
            type="date"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            className="w-[140px] border-[#E5E7EB] focus:border-[#F5B400] focus:ring-[#F5B400]/20 text-sm"
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
            variant={dateDebut === firstOfYear && dateFin === todayStr ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setDateDebut(firstOfYear); setDateFin(todayStr) }}
            className={dateDebut === firstOfYear && dateFin === todayStr ? 'bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] border-[#F5B400] text-xs px-3' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400] text-xs px-3'}
          >
            {today.getFullYear()}
          </Button>
          <Button
            variant={!dateDebut && !dateFin ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setDateDebut(''); setDateFin('') }}
            className={!dateDebut && !dateFin ? 'bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] border-[#F5B400] text-xs px-3' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400] text-xs px-3'}
          >
            Tout
          </Button>
          <div className="w-px h-6 bg-[#E5E7EB] mx-1" />
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchived((v) => !v)}
            className={showArchived ? 'bg-[#6B7280] hover:bg-[#4B5563] text-white border-[#6B7280] text-xs px-3' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#6B7280] text-xs px-3'}
            title={showArchived ? 'Revenir aux factures actives' : 'Afficher les factures archivees'}
          >
            <Archive className="h-3 w-3 mr-1" />
            {showArchived ? 'Voir actives' : 'Archivées'}
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {statutTabs.map((t) => (
          <Button
            key={t.key}
            variant={statutFilter === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatutFilter(t.key)}
            className={statutFilter === t.key ? 'bg-[#F5B400] hover:bg-[#D89A00] text-[#0A0A0B] border-[#F5B400]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#F5B400] hover:text-[#F5B400]'}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {sortedFiltered.length === 0 ? (
        <div className="border border-[#E5E7EB] rounded-xl bg-white w-full">
          <div className="text-center py-16 text-[#9CA3AF]">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">Aucune facture d&apos;achat trouvee</p>
          </div>
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
                <SortableTableHead label="Échéance" columnKey="echeance" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['echeance'] || ''} onFilterChange={setColumnFilter} className="hidden md:table-cell" />
                <SortableTableHead label="Montant TTC" columnKey="montant_ttc" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['montant_ttc'] || ''} onFilterChange={setColumnFilter} align="right" />
                <SortableTableHead label="Statut" columnKey="statut" sortKey={sortKey} sortDirection={sortDirection} onToggleSort={toggleSort} filterValue={columnFilters['statut'] || ''} onFilterChange={setColumnFilter} />
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiltered.map((facture) => (
                <TableRow key={facture.id} className="hover:bg-[#F9FAFB]/50">
                  <TableCell className="font-medium text-[#111827]">
                    <div className="flex items-center gap-2">
                      {facture.type === 'note_credit' && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] px-1.5 py-0">NC</Badge>
                      )}
                      {facture.peppol_source === 'peppol' && (
                        <Badge className="bg-[#F5B400]/15 text-[#D89A00] border-[#F5B400]/30 text-[10px] px-1.5 py-0" title="Importee automatiquement via Peppol">
                          Peppol
                        </Badge>
                      )}
                      <span>{facture.numero_fournisseur || '\u2014'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[#6B7280]">
                    {facture.fournisseur?.raison_sociale || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[#6B7280] max-w-[200px] truncate">
                    {facture.designation || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary" className="bg-[#F5B400]/10 text-[#F5B400]">
                      {CATEGORIE_LABELS[facture.categorie] || facture.categorie}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#9CA3AF]">{formatDate(facture.date_facture)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {facture.prochaine_echeance ? (
                      (() => {
                        const isOverdue = facture.statut !== 'paye' && facture.prochaine_echeance < new Date().toISOString().split('T')[0]
                        return (
                          <span className={isOverdue ? 'text-[#DC2626] font-medium' : 'text-[#6B7280]'}>
                            {formatDate(facture.prochaine_echeance)}
                          </span>
                        )
                      })()
                    ) : (
                      <span className="text-[#9CA3AF]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {facture.type === 'note_credit' ? (
                      <span className="text-red-600">
                        -{formatMontant(Math.abs(Number(facture.total_ttc)))}
                      </span>
                    ) : (
                      <span className="text-[#111827]">{formatMontant(facture.total_ttc)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUT_COLORS[facture.statut] || ''}>
                      {STATUT_LABELS[facture.statut] || facture.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                    {facture.fichier_url && (
                      <button
                        type="button"
                        title="Voir le fichier"
                        className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-[#FEF9EE] text-[#D89A00] hover:text-[#B87A00] transition-colors duration-150"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation()
                          handleDownloadFile(facture.fichier_url!)
                        }}
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    )}
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
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Changer le statut
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {(['a_payer', 'partiellement_paye', 'paye', 'en_retard'] as const).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                disabled={facture.statut === s}
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  handleChangeStatut(facture.id, s)
                                }}
                              >
                                {facture.statut === s && <CheckCircle2 className="h-3 w-3 mr-2 text-[#F5B400]" />}
                                {facture.statut !== s && <span className="w-3 h-3 mr-2" />}
                                {STATUT_LABELS[s] || s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        {showArchived ? (
                          <DropdownMenuItem
                            className="text-[#059669]"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation()
                              handleRestore(facture.id)
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Restaurer
                          </DropdownMenuItem>
                        ) : (
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
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
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
