'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Download, Receipt, ShoppingCart, Wallet } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportType = 'ventes' | 'achats' | 'tresorerie'

const EXPORT_OPTIONS: { type: ExportType; label: string; description: string; icon: typeof Receipt }[] = [
  {
    type: 'ventes',
    label: 'Factures emises',
    description: 'N° facture, client, TVA, montants HT/TVA/TTC, statut',
    icon: Receipt,
  },
  {
    type: 'achats',
    label: "Factures d'achat",
    description: 'Fournisseur, TVA, designation, categorie, montants',
    icon: ShoppingCart,
  },
  {
    type: 'tresorerie',
    label: 'Mouvements tresorerie',
    description: 'Date, libelle, type, montant, reference, rapprochement',
    icon: Wallet,
  },
]

export function ExportComptableDialog({ open, onOpenChange }: Props) {
  const currentYear = new Date().getFullYear()
  const [selectedType, setSelectedType] = useState<ExportType>('ventes')
  const [dateDebut, setDateDebut] = useState(`${currentYear}-01-01`)
  const [dateFin, setDateFin] = useState(`${currentYear}-12-31`)

  const handleExport = () => {
    const params = new URLSearchParams({
      type: selectedType,
      debut: dateDebut,
      fin: dateFin,
    })
    window.open(`/api/tresorerie/export?${params.toString()}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-[#17C2D7]" />
            Export comptable
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export type selection */}
          <div className="space-y-2">
            <Label>Type d&apos;export</Label>
            <div className="grid gap-2">
              {EXPORT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = selectedType === opt.type
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setSelectedType(opt.type)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-[#17C2D7] bg-[#17C2D7]/5'
                        : 'border-[#E5E7EB] hover:border-[#17C2D7]/50'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                        isSelected ? 'bg-[#17C2D7]/10' : 'bg-[#F3F4F6]'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-[#17C2D7]' : 'text-[#9CA3AF]'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${isSelected ? 'text-[#17C2D7]' : 'text-[#111827]'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">{opt.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dateDebut">Du</Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="border-[#E5E7EB]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateFin">Au</Label>
              <Input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="border-[#E5E7EB]"
              />
            </div>
          </div>

          {/* Quick period buttons */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: `${currentYear}`, debut: `${currentYear}-01-01`, fin: `${currentYear}-12-31` },
              { label: `${currentYear - 1}`, debut: `${currentYear - 1}-01-01`, fin: `${currentYear - 1}-12-31` },
              { label: 'T1', debut: `${currentYear}-01-01`, fin: `${currentYear}-03-31` },
              { label: 'T2', debut: `${currentYear}-04-01`, fin: `${currentYear}-06-30` },
              { label: 'T3', debut: `${currentYear}-07-01`, fin: `${currentYear}-09-30` },
              { label: 'T4', debut: `${currentYear}-10-01`, fin: `${currentYear}-12-31` },
            ].map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateDebut(p.debut)
                  setDateFin(p.fin)
                }}
                className={
                  dateDebut === p.debut && dateFin === p.fin
                    ? 'border-[#17C2D7] text-[#17C2D7] bg-[#17C2D7]/5'
                    : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#17C2D7] hover:text-[#17C2D7]'
                }
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Telecharger CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
