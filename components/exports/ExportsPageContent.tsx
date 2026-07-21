'use client'

import { useState } from 'react'
import { Download, Receipt, ShoppingCart, Wallet, FileSpreadsheet, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ExportConfig = {
  key: string
  label: string
  description: string
  format: 'CSV' | 'XLSX'
  icon: typeof Receipt
  url: (debut: string, fin: string) => string
  roles?: string[]
}

const EXPORTS: ExportConfig[] = [
  {
    key: 'ventes',
    label: 'Factures émises',
    description: 'N° facture, client, N° TVA, HT / TVA / TTC, statut, conditions',
    format: 'CSV',
    icon: Receipt,
    url: (debut, fin) => `/api/tresorerie/export?type=ventes&debut=${debut}&fin=${fin}`,
  },
  {
    key: 'journal-ventes',
    label: 'Journal des ventes',
    description: 'Factures + acomptes + avoirs avec totaux — format Excel pour comptable',
    format: 'XLSX',
    icon: BookOpen,
    url: (debut, fin) => `/api/factures/journal-ventes?debut=${debut}&fin=${fin}`,
  },
  {
    key: 'achats',
    label: "Factures d'achat",
    description: 'Fournisseur, N° TVA, catégorie, HT / TVA / TTC, statut',
    format: 'CSV',
    icon: ShoppingCart,
    url: (debut, fin) => `/api/tresorerie/export?type=achats&debut=${debut}&fin=${fin}`,
  },
  {
    key: 'journal-achats',
    label: 'Journal des achats',
    description: 'Factures fournisseurs avec totaux par catégorie — format Excel pour comptable',
    format: 'XLSX',
    icon: FileSpreadsheet,
    url: (debut, fin) => `/api/factures/journal-achats?debut=${debut}&fin=${fin}`,
  },
  {
    key: 'tresorerie',
    label: 'Mouvements trésorerie',
    description: 'Date, libellé, type, montant, référence bancaire, rapprochement',
    format: 'CSV',
    icon: Wallet,
    url: (debut, fin) => `/api/tresorerie/export?type=tresorerie&debut=${debut}&fin=${fin}`,
  },
]

export function ExportsPageContent() {
  const currentYear = new Date().getFullYear()
  const [dateDebut, setDateDebut] = useState(`${currentYear}-01-01`)
  const [dateFin, setDateFin] = useState(`${currentYear}-12-31`)

  const PERIODS = [
    { label: String(currentYear),     debut: `${currentYear}-01-01`,     fin: `${currentYear}-12-31` },
    { label: String(currentYear - 1), debut: `${currentYear - 1}-01-01`, fin: `${currentYear - 1}-12-31` },
    { label: 'T1', debut: `${currentYear}-01-01`, fin: `${currentYear}-03-31` },
    { label: 'T2', debut: `${currentYear}-04-01`, fin: `${currentYear}-06-30` },
    { label: 'T3', debut: `${currentYear}-07-01`, fin: `${currentYear}-09-30` },
    { label: 'T4', debut: `${currentYear}-10-01`, fin: `${currentYear}-12-31` },
  ]

  const isActive = (p: { debut: string; fin: string }) => dateDebut === p.debut && dateFin === p.fin

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-[#0A0A0B]">Exports comptables</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Téléchargez vos données sur la période de votre choix — CSV pour Excel, XLSX pour votre comptable.
        </p>
      </div>

      {/* Sélecteur de période */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-[#374151]">Période</p>

        {/* Raccourcis */}
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setDateDebut(p.debut); setDateFin(p.fin) }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                isActive(p)
                  ? 'border-[#1B3A6B] bg-[#1B3A6B] text-white'
                  : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#1B3A6B] hover:text-[#1B3A6B]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Dates libres */}
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="dateDebut" className="text-xs">Du</Label>
            <Input
              id="dateDebut"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="border-[#E5E7EB] text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateFin" className="text-xs">Au</Label>
            <Input
              id="dateFin"
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="border-[#E5E7EB] text-sm h-9"
            />
          </div>
        </div>
      </div>

      {/* Grille des exports */}
      <div className="grid gap-3">
        {/* Ventes */}
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mt-2">Ventes</p>
        {EXPORTS.filter(e => e.key === 'ventes' || e.key === 'journal-ventes').map((exp) => (
          <ExportCard key={exp.key} exp={exp} dateDebut={dateDebut} dateFin={dateFin} />
        ))}

        {/* Achats */}
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mt-3">Achats</p>
        {EXPORTS.filter(e => e.key === 'achats' || e.key === 'journal-achats').map((exp) => (
          <ExportCard key={exp.key} exp={exp} dateDebut={dateDebut} dateFin={dateFin} />
        ))}

        {/* Trésorerie */}
        <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mt-3">Trésorerie</p>
        {EXPORTS.filter(e => e.key === 'tresorerie').map((exp) => (
          <ExportCard key={exp.key} exp={exp} dateDebut={dateDebut} dateFin={dateFin} />
        ))}
      </div>
    </div>
  )
}

function ExportCard({ exp, dateDebut, dateFin }: { exp: ExportConfig; dateDebut: string; dateFin: string }) {
  const Icon = exp.icon
  const isXlsx = exp.format === 'XLSX'

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 hover:border-[#D1D5DB] transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#F3F4F6] shrink-0">
          <Icon className="h-4 w-4 text-[#6B7280]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111827]">{exp.label}</p>
          <p className="text-xs text-[#9CA3AF] truncate">{exp.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isXlsx
            ? 'text-[#059669] border-[#D1FAE5] bg-[#ECFDF5]'
            : 'text-[#2563EB] border-[#DBEAFE] bg-[#EFF6FF]'
        }`}>
          {exp.format}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] h-8 px-3"
          onClick={() => window.open(exp.url(dateDebut, dateFin), '_blank')}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Télécharger
        </Button>
      </div>
    </div>
  )
}
