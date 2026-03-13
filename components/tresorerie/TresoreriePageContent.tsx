'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { MouvementTresorerie } from '@/types/database'
import type { ResumeAnnuel } from '@/app/(app)/tresorerie/page'

type MouvementWithSource = MouvementTresorerie & {
  source?: 'auto' | 'manuel'
}
import { formatMontant, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  Circle,
  Zap,
  FileSpreadsheet,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { MouvementDialog } from './MouvementDialog'
import { ImportBancaireDialog } from './ImportBancaireDialog'
import { ExportComptableDialog } from './ExportComptableDialog'

const TYPE_LABELS: Record<string, string> = {
  encaissement_client: 'Encaissement client',
  paiement_fournisseur: 'Paiement fournisseur',
  autre_entree: 'Autre entree',
  autre_sortie: 'Autre sortie',
}

const TYPE_COLORS: Record<string, string> = {
  encaissement_client: 'bg-[#D1FAE5] text-[#059669]',
  paiement_fournisseur: 'bg-[#FEE2E2] text-[#DC2626]',
  autre_entree: 'bg-[#17C2D7]/10 text-[#17C2D7]',
  autre_sortie: 'bg-[#F3F4F6] text-[#6B7280]',
}

interface Props {
  initialMouvements: MouvementWithSource[]
  initialStats: {
    totalEncaissements: number
    totalDecaissements: number
    solde: number
  }
  resumesAnnuels?: ResumeAnnuel[]
}

export function TresoreriePageContent({ initialMouvements, resumesAnnuels }: Props) {
  const [mouvements, setMouvements] = useState(initialMouvements)
  const [typeFilter, setTypeFilter] = useState<string>('tous')
  const [sourceFilter, setSourceFilter] = useState<string>('tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [trimestreMode, setTrimestreMode] = useState<'ht' | 'tva'>('ht')
  const supabase = createClient()
  const router = useRouter()

  const filtered = useMemo(() => {
    return mouvements.filter((m) => {
      const matchType = typeFilter === 'tous' || m.type === typeFilter
      const matchSource = sourceFilter === 'tous' || m.source === sourceFilter
      const matchDateDebut = !dateDebut || m.date_mouvement >= dateDebut
      const matchDateFin = !dateFin || m.date_mouvement <= dateFin
      return matchType && matchSource && matchDateDebut && matchDateFin
    })
  }, [mouvements, typeFilter, sourceFilter, dateDebut, dateFin])

  const stats = useMemo(() => {
    const totalEncaissements = filtered
      .filter((m) => m.montant > 0)
      .reduce((sum, m) => sum + m.montant, 0)
    const totalDecaissements = filtered
      .filter((m) => m.montant < 0)
      .reduce((sum, m) => sum + Math.abs(m.montant), 0)
    const solde = totalEncaissements - totalDecaissements
    return { totalEncaissements, totalDecaissements, solde }
  }, [filtered])

  const isManual = (m: MouvementWithSource) => m.source === 'manuel' || !m.source

  const handleRefresh = () => {
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('mouvements_tresorerie').delete().eq('id', id)
    if (error) {
      toast.error('Erreur lors de la suppression')
    } else {
      toast.success('Mouvement supprime')
      setMouvements((prev) => prev.filter((m) => m.id !== id))
    }
  }

  const handleToggleRapproche = async (m: MouvementWithSource) => {
    if (!isManual(m)) {
      // For auto entries, toggle locally only (not persisted in mouvements_tresorerie)
      setMouvements((prev) =>
        prev.map((item) =>
          item.id === m.id ? { ...item, rapproche: !item.rapproche } : item
        )
      )
      return
    }
    const { error } = await supabase
      .from('mouvements_tresorerie')
      .update({ rapproche: !m.rapproche })
      .eq('id', m.id)
    if (error) {
      toast.error('Erreur lors de la mise a jour')
    } else {
      setMouvements((prev) =>
        prev.map((item) =>
          item.id === m.id ? { ...item, rapproche: !item.rapproche } : item
        )
      )
    }
  }

  // Resume annuel data
  const currentResume = resumesAnnuels?.find((r) => r.annee === selectedYear)
  const availableYears = resumesAnnuels?.map((r) => r.annee) || []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Tresorerie</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setExportDialogOpen(true)}
            className="border-[#E5E7EB] text-[#6B7280] hover:border-[#17C2D7] hover:text-[#17C2D7]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            className="border-[#E5E7EB] text-[#6B7280] hover:border-[#17C2D7] hover:text-[#17C2D7]"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import bancaire
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau mouvement
          </Button>
        </div>
      </div>

      {/* Resume annee financiere */}
      {resumesAnnuels && resumesAnnuels.length > 0 && (
        <Card className="mb-6 border-[#E5E7EB]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
                <Calendar className="h-4 w-4 text-[#17C2D7]" />
                Exercice {selectedYear} — 1/01/{selectedYear} au 31/12/{selectedYear}
              </CardTitle>
              <Select
                value={String(selectedYear)}
                onValueChange={(val: string | null) => { if (val) setSelectedYear(Number(val)) }}
              >
                <SelectTrigger className="w-[100px] border-[#E5E7EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {currentResume && (
              <div className="space-y-6">
                {/* Chiffre d'affaires table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-2 pr-4 text-[12px] font-semibold text-[#17C2D7] uppercase tracking-wide">
                          Chiffre d&apos;affaires
                        </th>
                        <th className="text-right py-2 px-3 text-[12px] font-semibold text-[#17C2D7] uppercase tracking-wide">
                          Ventes
                        </th>
                        <th className="text-right py-2 px-3 text-[12px] font-semibold text-[#17C2D7] uppercase tracking-wide">
                          Achats
                        </th>
                        <th className="text-right py-2 pl-3 text-[12px] font-semibold text-[#17C2D7] uppercase tracking-wide">
                          Flux financier
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#F3F4F6]">
                        <td className="py-2.5 pr-4 text-[#6B7280]">Total hors TVA</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#111827]">
                          {formatMontant(currentResume.ventes.total_ht)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#111827]">
                          {formatMontant(currentResume.achats.total_ht)}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-[#111827]">
                          {formatMontant(currentResume.ventes.total_ht - currentResume.achats.total_ht)}
                        </td>
                      </tr>
                      <tr className="border-b border-[#F3F4F6]">
                        <td className="py-2.5 pr-4 text-[#6B7280]">Total TVA</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#111827]">
                          {formatMontant(currentResume.ventes.total_tva)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#111827]">
                          {formatMontant(currentResume.achats.total_tva)}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-[#111827]">
                          {formatMontant(currentResume.ventes.total_tva - currentResume.achats.total_tva)}
                        </td>
                      </tr>
                      <tr className="border-b border-[#F3F4F6]">
                        <td className="py-2.5 pr-4 text-[#6B7280]">Total facture</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#111827]">
                          {formatMontant(currentResume.ventes.total_ttc)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#111827]">
                          {formatMontant(currentResume.achats.total_ttc)}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-[#111827]">
                          {formatMontant(currentResume.ventes.total_ttc - currentResume.achats.total_ttc)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 pr-4 text-[#6B7280]">Total ouvert</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#DC2626]">
                          {formatMontant(currentResume.ventes.total_ouvert)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#DC2626]">
                          {formatMontant(currentResume.achats.total_ouvert)}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-[#DC2626]">
                          {formatMontant(currentResume.ventes.total_ouvert - currentResume.achats.total_ouvert)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Trimestres */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[#111827]">
                      <Calendar className="h-3.5 w-3.5 text-[#17C2D7]" />
                      Trimestres
                    </h3>
                    <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden">
                      <button
                        onClick={() => setTrimestreMode('ht')}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          trimestreMode === 'ht'
                            ? 'bg-[#17C2D7] text-white'
                            : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        Tot. Excl.
                      </button>
                      <button
                        onClick={() => setTrimestreMode('tva')}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          trimestreMode === 'tva'
                            ? 'bg-[#17C2D7] text-white'
                            : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        TVA
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB]">
                          <th className="text-left py-2 pr-4 text-[12px] font-semibold text-[#17C2D7] uppercase tracking-wide">
                            Flux financier
                          </th>
                          {availableYears.map((y) => (
                            <th key={y} className="text-right py-2 px-3 text-[12px] font-semibold text-[#17C2D7] uppercase tracking-wide">
                              {y}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4].map((q) => (
                          <tr key={q} className="border-b border-[#F3F4F6]">
                            <td className="py-2.5 pr-4 text-[#6B7280]">Trimestre {q}</td>
                            {availableYears.map((y) => {
                              const yearData = resumesAnnuels?.find((r) => r.annee === y)
                              const qData = yearData?.trimestres.find((t) => t.trimestre === q)
                              const val = trimestreMode === 'ht' ? (qData?.flux || 0) : (qData?.ventes_ttc || 0) - (qData?.achats_ttc || 0)
                              return (
                                <td
                                  key={y}
                                  className={`py-2.5 px-3 text-right font-medium ${
                                    val > 0 ? 'text-[#059669]' : val < 0 ? 'text-[#DC2626]' : 'text-[#9CA3AF]'
                                  }`}
                                >
                                  {formatMontant(val)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-[#E5E7EB] hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">
              Encaissements
            </CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#D1FAE5]">
              <TrendingUp className="h-4 w-4 text-[#059669]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#059669]">
              {formatMontant(stats.totalEncaissements)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">
              Decaissements
            </CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#FEE2E2]">
              <TrendingDown className="h-4 w-4 text-[#DC2626]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#DC2626]">
              {formatMontant(stats.totalDecaissements)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E7EB] hover-lift">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">Solde</CardTitle>
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#17C2D7]/10">
              <Wallet className="h-4 w-4 text-[#17C2D7]" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${stats.solde >= 0 ? 'text-[#111827]' : 'text-[#DC2626]'}`}
            >
              {formatMontant(stats.solde)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 border-[#E5E7EB]">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select value={typeFilter} onValueChange={(val: string | null) => { if (val) setTypeFilter(val) }}>
                <SelectTrigger className="w-full border-[#E5E7EB]">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les types</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={sourceFilter} onValueChange={(val: string | null) => { if (val) setSourceFilter(val) }}>
                <SelectTrigger className="w-full border-[#E5E7EB]">
                  <SelectValue placeholder="Toutes les sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les sources</SelectItem>
                  <SelectItem value="auto">Automatique</SelectItem>
                  <SelectItem value="manuel">Manuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                placeholder="Date debut"
                className="w-40 border-[#E5E7EB]"
              />
              <Input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                placeholder="Date fin"
                className="w-40 border-[#E5E7EB]"
              />
            </div>
            {(typeFilter !== 'tous' || sourceFilter !== 'tous' || dateDebut || dateFin) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTypeFilter('tous')
                  setSourceFilter('tous')
                  setDateDebut('')
                  setDateFin('')
                }}
                className="text-[#9CA3AF] hover:text-[#17C2D7]"
              >
                Reinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-[#E5E7EB]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[#6B7280]">Date</TableHead>
                <TableHead className="text-[#6B7280]">Libelle</TableHead>
                <TableHead className="text-[#6B7280]">Type</TableHead>
                <TableHead className="hidden md:table-cell text-[#6B7280]">Source</TableHead>
                <TableHead className="text-right text-[#6B7280]">Montant</TableHead>
                <TableHead className="text-center text-[#6B7280]">Rapproche</TableHead>
                <TableHead className="text-right text-[#6B7280]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-[#9CA3AF]">
                    Aucun mouvement trouve
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-[#F9FAFB]/50">
                    <TableCell className="text-[#9CA3AF]">{formatDate(m.date_mouvement)}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-[#111827]">{m.libelle}</span>
                        {m.reference_bancaire && (
                          <span className="block text-xs text-[#9CA3AF]">
                            Ref: {m.reference_bancaire}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[m.type] || 'bg-[#F3F4F6] text-[#6B7280]'}>
                        {TYPE_LABELS[m.type] || m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {m.source === 'auto' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#7C3AED]">
                          <Zap className="h-3 w-3" />
                          Auto
                        </span>
                      ) : (
                        <span className="text-xs text-[#9CA3AF]">Manuel</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono font-semibold ${
                          m.montant >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'
                        }`}
                      >
                        {m.montant >= 0 ? '+' : ''}
                        {formatMontant(m.montant)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleToggleRapproche(m)}
                        className="inline-flex items-center justify-center hover:scale-110 transition-transform duration-150"
                        title={m.rapproche ? 'Marquer comme non rapproche' : 'Marquer comme rapproche'}
                      >
                        {m.rapproche ? (
                          <CheckCircle className="h-4 w-4 text-[#059669]" />
                        ) : (
                          <Circle className="h-4 w-4 text-[#D1D5DB]" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      {isManual(m) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-[#F3F4F6] transition-colors duration-150"
                          >
                            <MoreHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="whitespace-nowrap">
                            <DropdownMenuItem onClick={() => handleDelete(m.id)} className="text-[#DC2626]">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-[#D1D5DB]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MouvementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleRefresh}
      />

      <ImportBancaireDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleRefresh}
      />

      <ExportComptableDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />
    </div>
  )
}
