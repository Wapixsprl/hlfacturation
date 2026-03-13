'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Fournisseur } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Search, MoreHorizontal, Pencil, Archive, Truck, Users, TrendingUp, FileText, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMontant } from '@/lib/utils'
import { toast } from 'sonner'
import { FournisseurDialog } from './FournisseurDialog'

type FournisseurWithAchat = Fournisseur & {
  dernier_achat?: string | null
  total_achats?: number
  nb_factures?: number
}

interface FournisseurStats {
  totalFournisseurs: number
  totalAchatsTTC: number
  nbFacturesAchat: number
  nbImpaye: number
}

interface Props {
  initialFournisseurs: FournisseurWithAchat[]
  stats: FournisseurStats
}

export function FournisseursPageContent({ initialFournisseurs, stats }: Props) {
  const [fournisseurs, setFournisseurs] = useState(initialFournisseurs)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const filtered = useMemo(() => fournisseurs.filter((f) => {
    return [f.raison_sociale, f.contact_nom, f.email, f.tva_numero]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  }), [fournisseurs, search])

  const refreshFournisseurs = async () => {
    const { data } = await supabase
      .from('fournisseurs')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (data) setFournisseurs(data)
  }

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('fournisseurs')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error("Erreur lors de l'archivage")
    } else {
      toast.success('Fournisseur archive')
      refreshFournisseurs()
    }
  }

  const handleEdit = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditingFournisseur(null)
    setDialogOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Fournisseurs</h1>
        <Button onClick={handleNew} className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau fournisseur
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Fournisseurs</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{stats.totalFournisseurs}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Volume achats</span>
          </div>
          <p className="text-lg font-bold text-[#7C3AED] tabular-nums">{formatMontant(stats.totalAchatsTTC)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-[#059669]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Factures</span>
          </div>
          <p className="text-lg font-bold text-[#059669] tabular-nums">{stats.nbFacturesAchat}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Impayes</span>
          </div>
          <p className="text-lg font-bold text-[#DC2626] tabular-nums">{stats.nbImpaye}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Rechercher un fournisseur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Truck className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucun fournisseur trouve</p>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[#6B7280]">Raison sociale</TableHead>
                <TableHead className="hidden md:table-cell text-[#6B7280]">Contact</TableHead>
                <TableHead className="hidden md:table-cell text-[#6B7280]">Email</TableHead>
                <TableHead className="hidden md:table-cell text-[#6B7280]">Telephone</TableHead>
                <TableHead className="hidden lg:table-cell text-[#6B7280]">TVA</TableHead>
                <TableHead className="hidden lg:table-cell text-[#6B7280]">Dernier achat</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((fournisseur) => (
                <TableRow
                  key={fournisseur.id}
                  className="cursor-pointer hover:bg-[#F9FAFB]/50"
                  onClick={() => router.push(`/fournisseurs/${fournisseur.id}`)}
                >
                  <TableCell className="font-medium text-[#111827]">{fournisseur.raison_sociale}</TableCell>
                  <TableCell className="hidden md:table-cell text-[#6B7280]">
                    {fournisseur.contact_nom || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[#6B7280]">
                    {fournisseur.email || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[#6B7280]">
                    {fournisseur.telephone || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-[#9CA3AF]">
                    {fournisseur.tva_numero || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-[#9CA3AF]">
                    {fournisseur.dernier_achat ? formatDate(fournisseur.dernier_achat) : '\u2014'}
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
                            handleEdit(fournisseur)
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[#DC2626]"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            handleArchive(fournisseur.id)
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

      <FournisseurDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fournisseur={editingFournisseur}
        onSuccess={refreshFournisseurs}
      />
    </div>
  )
}
