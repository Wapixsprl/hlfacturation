'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type { Produit } from '@/types/database'
import { formatMontant } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Pencil, Archive, Package, Check, X, Layers, TrendingUp, Tag, Euro } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ProduitDialog } from './ProduitDialog'

const categorieLabels: Record<string, string> = {
  materiaux: 'Materiaux',
  main_oeuvre: "Main d'oeuvre",
  sous_traitance: 'Sous-traitance',
  equipement: 'Equipement',
  forfait: 'Forfait',
  autre: 'Autre',
}

const uniteLabels: Record<string, string> = {
  h: 'h', j: 'jour', forfait: 'forfait', m2: 'm2', m3: 'm3',
  ml: 'ml', piece: 'piece', lot: 'lot', kg: 'kg', l: 'L', autre: 'autre',
}

interface Props {
  initialProduits: Produit[]
}

interface EditingCell {
  produitId: string
  field: 'designation' | 'prix_ht'
  value: string
}

export function ProduitsPageContent({ initialProduits }: Props) {
  const [produits, setProduits] = useState(initialProduits)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('tous')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduit, setEditingProduit] = useState<Produit | null>(null)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // Statistics
  const stats = useMemo(() => {
    const total = produits.length
    const actifs = produits.filter((p) => p.actif).length
    const prixMoyen = total > 0 ? produits.reduce((s, p) => s + p.prix_ht, 0) / total : 0

    // Top categorie by count
    const catCount: Record<string, number> = {}
    for (const p of produits) {
      const cat = p.categorie || 'autre'
      catCount[cat] = (catCount[cat] || 0) + 1
    }
    const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]

    return { total, actifs, prixMoyen, topCat }
  }, [produits])

  const filtered = produits.filter((p) => {
    const matchSearch = [p.designation, p.reference, p.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchCat = catFilter === 'tous' || p.categorie === catFilter
    return matchSearch && matchCat
  })

  const refreshProduits = async () => {
    const { data } = await supabase
      .from('produits')
      .select('*')
      .is('archived_at', null)
      .order('designation', { ascending: true })
    if (data) setProduits(data)
  }

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('produits')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) toast.error('Erreur lors de l\'archivage')
    else { toast.success('Produit archive'); refreshProduits() }
  }

  const startEditing = (produit: Produit, field: 'designation' | 'prix_ht') => {
    setEditingCell({
      produitId: produit.id,
      field,
      value: field === 'prix_ht' ? String(produit.prix_ht) : produit.designation,
    })
  }

  const cancelEditing = () => {
    setEditingCell(null)
  }

  const saveEditing = async () => {
    if (!editingCell) return

    const updateData: Record<string, unknown> = {}
    if (editingCell.field === 'designation') {
      if (!editingCell.value.trim()) {
        toast.error('La designation ne peut pas etre vide')
        return
      }
      updateData.designation = editingCell.value.trim()
    } else {
      const val = parseFloat(editingCell.value)
      if (isNaN(val) || val < 0) {
        toast.error('Prix invalide')
        return
      }
      updateData.prix_ht = Math.round(val * 100) / 100
    }

    const { error } = await supabase
      .from('produits')
      .update(updateData)
      .eq('id', editingCell.produitId)

    if (error) {
      toast.error('Erreur lors de la mise a jour')
    } else {
      setProduits((prev) =>
        prev.map((p) =>
          p.id === editingCell.produitId ? { ...p, ...updateData } as Produit : p
        )
      )
      toast.success('Produit mis a jour')
    }
    setEditingCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEditing()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Catalogue produits</h1>
        <Button onClick={() => { setEditingProduit(null); setDialogOpen(true) }} className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau produit
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total produits</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-[#059669]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Actifs</span>
          </div>
          <p className="text-lg font-bold text-[#059669] tabular-nums">{stats.actifs}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Prix moyen HT</span>
          </div>
          <p className="text-lg font-bold text-[#7C3AED] tabular-nums">{formatMontant(stats.prixMoyen)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="h-4 w-4 text-[#D97706]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Top categorie</span>
          </div>
          <p className="text-lg font-bold text-[#D97706] tabular-nums">
            {stats.topCat ? `${categorieLabels[stats.topCat[0]] || stats.topCat[0]} (${stats.topCat[1]})` : '\u2014'}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-[#E5E7EB] focus:border-[#17C2D7] focus:ring-[#17C2D7]/20" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['tous', ...Object.keys(categorieLabels)].map((cat) => (
            <Button
              key={cat}
              variant={catFilter === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCatFilter(cat)}
              className={catFilter === cat ? 'bg-[#17C2D7] hover:bg-[#14a8bc] text-white border-[#17C2D7]' : 'text-[#6B7280] border-[#E5E7EB] hover:border-[#17C2D7] hover:text-[#17C2D7]'}
            >
              {cat === 'tous' ? 'Tous' : categorieLabels[cat]}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucun produit trouve</p>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[#6B7280]">Ref.</TableHead>
                <TableHead className="text-[#6B7280]">Designation</TableHead>
                <TableHead className="text-[#6B7280]">Categorie</TableHead>
                <TableHead className="text-right text-[#6B7280]">Prix HT</TableHead>
                <TableHead className="text-right hidden md:table-cell text-[#6B7280]">Prix TTC</TableHead>
                <TableHead className="text-[#6B7280]">TVA</TableHead>
                <TableHead className="text-[#6B7280]">Unite</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const prixTTC = Math.round(p.prix_ht * (1 + p.taux_tva / 100) * 100) / 100
                return (
                  <TableRow key={p.id} className="hover:bg-[#F9FAFB]/50">
                    <TableCell className="text-[#9CA3AF]">{p.reference || '\u2014'}</TableCell>
                    <TableCell className="font-medium text-[#111827]">
                      {editingCell?.produitId === p.id && editingCell.field === 'designation' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            ref={inputRef}
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                            onKeyDown={handleKeyDown}
                            onBlur={saveEditing}
                            className="h-7 text-sm border-[#17C2D7] focus:ring-[#17C2D7]/20"
                          />
                          <button onClick={saveEditing} className="text-[#059669] hover:text-[#059669]/80 shrink-0">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={cancelEditing} className="text-[#DC2626] hover:text-[#DC2626]/80 shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#17C2D7] transition-colors border-b border-dashed border-transparent hover:border-[#17C2D7]"
                          onClick={(e) => { e.stopPropagation(); startEditing(p, 'designation') }}
                          title="Cliquer pour modifier"
                        >
                          {p.designation}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#17C2D7]/10 text-[#17C2D7]">
                        {categorieLabels[p.categorie] || p.categorie}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-[#111827]">
                      {editingCell?.produitId === p.id && editingCell.field === 'prix_ht' ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingCell.value}
                            onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                            onKeyDown={handleKeyDown}
                            onBlur={saveEditing}
                            className="h-7 w-24 text-sm text-right border-[#17C2D7] focus:ring-[#17C2D7]/20"
                          />
                          <button onClick={saveEditing} className="text-[#059669] hover:text-[#059669]/80 shrink-0">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={cancelEditing} className="text-[#DC2626] hover:text-[#DC2626]/80 shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:text-[#17C2D7] transition-colors border-b border-dashed border-transparent hover:border-[#17C2D7]"
                          onClick={(e) => { e.stopPropagation(); startEditing(p, 'prix_ht') }}
                          title="Cliquer pour modifier"
                        >
                          {formatMontant(p.prix_ht)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell text-[#6B7280]">
                      {formatMontant(prixTTC)}
                    </TableCell>
                    <TableCell className="text-[#6B7280]">{p.taux_tva}%</TableCell>
                    <TableCell className="text-[#9CA3AF]">{uniteLabels[p.unite] || p.unite}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-[#F3F4F6] transition-colors duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="whitespace-nowrap">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingProduit(p); setDialogOpen(true) }}>
                            <Pencil className="h-4 w-4 mr-2" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-[#DC2626]" onClick={(e) => { e.stopPropagation(); handleArchive(p.id) }}>
                            <Archive className="h-4 w-4 mr-2" /> Archiver
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

      <ProduitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        produit={editingProduit}
        onSuccess={refreshProduits}
      />
    </div>
  )
}
