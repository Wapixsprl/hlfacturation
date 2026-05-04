'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, X } from 'lucide-react'

type ImportType = 'devis' | 'factures' | 'factures_achat'

interface ImportResult {
  imported: number
  errors: string[]
}

// Colonnes à afficher en prévisualisation par type
const PREVIEW_COLUMNS: Record<ImportType, string[]> = {
  devis: ['Numéro', 'Référence', 'Date', 'Client', 'Total HT', 'Total TTC', 'Statut'],
  factures: ['Numéro de la facture', 'Nom du client', 'Date de la facture', 'Type', 'Total HT', 'Total TTC', 'Statut'],
  factures_achat: ['Numéro', 'Fournisseur', 'Date', 'Total HT', 'Total TTC', 'Statut'],
}

function parseExcel(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'binary', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Erreur lecture fichier'))
    reader.readAsBinaryString(file)
  })
}

function findColumn(row: Record<string, unknown>, candidates: string[]): string {
  for (const key of Object.keys(row)) {
    if (candidates.some(c => key.toLowerCase().includes(c.toLowerCase()))) return key
  }
  return candidates[0]
}

function ImportSection({ type, description }: { type: ImportType; label?: string; description: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Format invalide — utilisez .xlsx, .xls ou .csv')
      return
    }
    setResult(null)
    setFileName(file.name)
    try {
      const parsed = await parseExcel(file)
      setRows(parsed)
      toast.success(`${parsed.length} lignes lues`)
    } catch {
      toast.error('Impossible de lire le fichier')
      setRows([])
    }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    if (rows.length === 0) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, rows }),
      })
      const data = await res.json() as ImportResult | { error: string }
      if (!res.ok) {
        toast.error('error' in data ? data.error : 'Erreur serveur')
        return
      }
      const r = data as ImportResult
      setResult(r)
      if (r.imported > 0) toast.success(`${r.imported} ligne(s) importée(s)`)
      if (r.errors.length > 0) toast.warning(`${r.errors.length} erreur(s)`)
    } catch {
      toast.error('Erreur lors de l\'import')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setRows([])
    setFileName('')
    setResult(null)
  }

  const previewCols = PREVIEW_COLUMNS[type]
  // Find actual column keys from first row
  const firstRow = rows[0]
  const actualCols = firstRow
    ? previewCols.map(c => findColumn(firstRow, [c]))
    : previewCols

  const previewRows = rows.slice(0, 10)

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6B7280]">{description}</p>

      {/* Drop zone */}
      {rows.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${dragging ? 'border-[#17C2D7] bg-[#F0FDFF]' : 'border-[#E5E7EB] hover:border-[#17C2D7] hover:bg-[#F9FAFB]'}
          `}
        >
          <FileSpreadsheet className="h-10 w-10 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#374151]">Glissez votre fichier ici</p>
          <p className="text-xs text-[#9CA3AF] mt-1">ou cliquez pour parcourir (.xlsx, .xls, .csv)</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info + actions */}
          <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#17C2D7]" />
              <div>
                <p className="text-sm font-medium text-[#141414]">{fileName}</p>
                <p className="text-xs text-[#6B7280]">{rows.length} ligne{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={loading}>
                <X className="h-3.5 w-3.5" />
                Changer
              </Button>
              <Button size="sm" onClick={handleImport} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {loading ? 'Import...' : `Importer ${rows.length} ligne${rows.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>

          {/* Résultat */}
          {result && (
            <div className={`rounded-lg border px-4 py-3 space-y-2 ${result.errors.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">{result.imported} importé{result.imported > 1 ? 's' : ''}</span>
                {result.errors.length > 0 && (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600 ml-2" />
                    <span className="text-sm font-medium text-amber-800">{result.errors.length} erreur{result.errors.length > 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
              {result.errors.length > 0 && (
                <ul className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                      <span className="shrink-0">—</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Prévisualisation */}
          <div>
            <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-2">
              Prévisualisation — {Math.min(rows.length, 10)} première{rows.length > 1 ? 's' : ''} ligne{rows.length > 1 ? 's' : ''} sur {rows.length}
            </p>
            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {actualCols.map(col => (
                      <TableHead key={col} className="whitespace-nowrap text-xs">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {actualCols.map(col => (
                        <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                          {String(row[col] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ImportTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-[#17C2D7]" />
          Import Vertuoza
        </CardTitle>
        <CardDescription>
          Importez vos données depuis Vertuoza via les exports Excel. Les doublons sont automatiquement ignorés.
          Les numéros générés utilisent le format <Badge variant="secondary" className="font-mono text-xs">IMP-XXXX</Badge> pour ne pas perturber la numérotation officielle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="devis">
          <TabsList variant="line" className="mb-6">
            <TabsTrigger value="devis">Devis</TabsTrigger>
            <TabsTrigger value="factures">Factures</TabsTrigger>
            <TabsTrigger value="factures_achat">
              Factures d&apos;achat
              <Badge variant="outline" className="ml-1.5 text-[10px]">Bientôt</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devis">
            <ImportSection
              type="devis"
              label="Devis"
              description="Importez l'export Excel des devis Vertuoza (export_quote_*.xlsx). Colonnes requises : Numéro, Référence, Date, Client, Total HT, Total TTC, Statut."
            />
          </TabsContent>

          <TabsContent value="factures">
            <ImportSection
              type="factures"
              label="Factures"
              description="Importez l'export Excel des factures Vertuoza (export_*.xlsx). Colonnes requises : Numéro de la facture, Nom du client, Date de la facture, Type, Total HT, Total TTC, Statut."
            />
          </TabsContent>

          <TabsContent value="factures_achat">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
              <Upload className="h-10 w-10 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#374151]">Import des factures d&apos;achat</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Cette fonctionnalité sera disponible prochainement.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 rounded-lg border border-[#FEF3C7] bg-[#FFFBEB] p-3">
          <p className="text-[13px] text-[#92400E]">
            <strong>Important :</strong> L&apos;import crée une ligne unique par document avec le total HT.
            Les détails de lignes (matériaux, main d&apos;œuvre, etc.) ne sont pas importés.
            Vérifiez les données importées avant toute utilisation comptable.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
