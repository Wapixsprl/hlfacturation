'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatMontant } from '@/lib/utils'

interface PreviewRow {
  date: string
  libelle: string
  montant: number
  reference?: string
}

interface PreviewData {
  count: number
  errors: number
  errorDetails: string[]
  rows: PreviewRow[]
  totalCredit: number
  totalDebit: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Step = 'upload' | 'preview' | 'importing' | 'done'

export function ImportBancaireDialog({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setResult(null)
    setLoading(false)
    setDragActive(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState()
    onOpenChange(nextOpen)
  }

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('preview', 'true')

      const res = await fetch('/api/tresorerie/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de la lecture du fichier')
        if (data.details?.length) {
          data.details.forEach((d: string) => toast.error(d))
        }
        setFile(null)
        return
      }

      setPreview(data)
      setStep('preview')
    } catch {
      toast.error('Erreur lors de la lecture du fichier')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setStep('importing')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/tresorerie/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'import")
        setStep('preview')
        return
      }

      setResult({ inserted: data.inserted, errors: data.errors })
      setStep('done')
      toast.success(`${data.inserted} mouvement(s) importe(s)`)
    } catch {
      toast.error("Erreur lors de l'import")
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#17C2D7]" />
            Import bancaire
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div>
            <p className="text-sm text-[#6B7280] mb-4">
              Importez un releve bancaire au format XLSX, XLS ou CSV. Les colonnes Date, Libelle et Montant seront detectees automatiquement.
            </p>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive
                  ? 'border-[#17C2D7] bg-[#17C2D7]/5'
                  : 'border-[#E5E7EB] hover:border-[#17C2D7]/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-[#17C2D7] animate-spin" />
                  <p className="text-sm text-[#6B7280]">Analyse du fichier...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 cursor-pointer">
                  <Upload className="h-10 w-10 text-[#9CA3AF]" />
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      Glissez votre fichier ici ou cliquez pour parcourir
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                      XLSX, XLS ou CSV — 5 Mo max
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelect(f)
                }}
              />
            </div>

            <div className="mt-4 p-3 bg-[#F9FAFB] rounded-lg">
              <p className="text-xs font-medium text-[#6B7280] mb-2">Formats compatibles :</p>
              <ul className="text-xs text-[#9CA3AF] space-y-1">
                <li>• Belfius, BNP Paribas Fortis, ING, KBC — exports CSV/XLSX standard</li>
                <li>• Colonnes attendues : Date, Libelle/Description, Montant (ou Credit/Debit)</li>
                <li>• Les montants negatifs = sorties, positifs = entrees</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 p-3 bg-[#D1FAE5]/50 rounded-lg text-center">
                <p className="text-lg font-bold text-[#059669]">
                  {formatMontant(preview.totalCredit)}
                </p>
                <p className="text-xs text-[#059669]">Entrees</p>
              </div>
              <div className="flex-1 p-3 bg-[#FEE2E2]/50 rounded-lg text-center">
                <p className="text-lg font-bold text-[#DC2626]">
                  {formatMontant(preview.totalDebit)}
                </p>
                <p className="text-xs text-[#DC2626]">Sorties</p>
              </div>
              <div className="flex-1 p-3 bg-[#17C2D7]/5 rounded-lg text-center">
                <p className="text-lg font-bold text-[#111827]">{preview.count}</p>
                <p className="text-xs text-[#6B7280]">Lignes</p>
              </div>
            </div>

            {preview.errors > 0 && (
              <div className="mb-3 p-2 bg-[#FEF3C7] rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-[#D97706] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[#D97706]">
                    {preview.errors} ligne(s) ignoree(s)
                  </p>
                  {preview.errorDetails.map((e, i) => (
                    <p key={i} className="text-xs text-[#D97706]/80">{e}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="text-[#6B7280] text-xs">Date</TableHead>
                    <TableHead className="text-[#6B7280] text-xs">Libelle</TableHead>
                    <TableHead className="text-right text-[#6B7280] text-xs">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-[#F9FAFB]/50">
                      <TableCell className="text-xs text-[#9CA3AF]">{row.date}</TableCell>
                      <TableCell className="text-xs text-[#111827] max-w-[250px] truncate">
                        {row.libelle}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-semibold">
                        <span className={row.montant >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}>
                          {row.montant >= 0 ? '+' : ''}
                          {formatMontant(row.montant)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {preview.count > 20 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-[#9CA3AF] py-2">
                        ... et {preview.count - 20} autres lignes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => resetState()}>
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white"
              >
                Importer {preview.count} mouvement(s)
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="text-center py-8">
            <Loader2 className="h-10 w-10 text-[#17C2D7] animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">Import en cours...</p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && result && (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-[#059669] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#111827] mb-1">Import termine !</p>
            <p className="text-sm text-[#6B7280]">
              {result.inserted} mouvement(s) importe(s) avec succes
            </p>
            {result.errors > 0 && (
              <Badge className="mt-2 bg-[#FEF3C7] text-[#D97706]">
                {result.errors} ligne(s) ignoree(s)
              </Badge>
            )}

            <DialogFooter className="mt-6 justify-center">
              <Button
                onClick={() => {
                  handleOpenChange(false)
                  onSuccess()
                }}
                className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white"
              >
                Fermer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
