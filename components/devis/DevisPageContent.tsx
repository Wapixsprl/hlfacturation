'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Devis, Client } from '@/types/database'
import { formatMontant, formatDate } from '@/lib/utils'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Archive,
  FileText,
  Send,
  Loader2,
  FileOutput,
  Download,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const statutConfig: Record<string, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-[#F3F4F6] text-[#6B7280]' },
  envoye: { label: 'Envoye', className: 'bg-[#17C2D7]/10 text-[#17C2D7]' },
  accepte: { label: 'Accepte', className: 'bg-[#D1FAE5] text-[#059669]' },
  refuse: { label: 'Refuse', className: 'bg-[#FEE2E2] text-[#DC2626]' },
  expire: { label: 'Expire', className: 'bg-[#FEF3C7] text-[#D97706]' },
  converti: { label: 'Converti', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
}

type DevisWithClient = Devis & {
  client: Pick<Client, 'nom' | 'prenom' | 'raison_sociale' | 'type'> | null
}

interface Props {
  initialDevis: DevisWithClient[]
}

export function DevisPageContent({ initialDevis }: Props) {
  const [devisList, setDevisList] = useState(initialDevis)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const getClientName = (d: DevisWithClient): string => {
    if (!d.client) return '\u2014'
    if (d.client.type === 'professionnel' && d.client.raison_sociale) {
      return d.client.raison_sociale
    }
    return (
      [d.client.prenom, d.client.nom].filter(Boolean).join(' ') || '\u2014'
    )
  }

  const filtered = devisList.filter((d) => {
    const clientName = getClientName(d)
    const matchSearch = [d.numero, clientName, d.titre]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchStatut = statutFilter === 'tous' || d.statut === statutFilter
    const matchDateDebut = !dateDebut || d.date_devis >= dateDebut
    const matchDateFin = !dateFin || d.date_devis <= dateFin
    return matchSearch && matchStatut && matchDateDebut && matchDateFin
  })

  // Statistics computed on filtered results
  const stats = useMemo(() => {
    const totalDevis = filtered.reduce((sum, d) => sum + d.total_ttc, 0)
    const totalAccepte = filtered
      .filter((d) => d.statut === 'accepte' || d.statut === 'converti')
      .reduce((sum, d) => sum + d.total_ttc, 0)
    const nbEnvoyes = filtered.filter((d) => d.statut === 'envoye').length
    const nbAcceptes = filtered.filter((d) => d.statut === 'accepte' || d.statut === 'converti').length
    const nbRefuses = filtered.filter((d) => d.statut === 'refuse').length
    const nbEnvoyesTotal = nbEnvoyes + nbAcceptes + nbRefuses
    const tauxAcceptation = nbEnvoyesTotal > 0 ? Math.round((nbAcceptes / nbEnvoyesTotal) * 100) : 0

    return { totalDevis, totalAccepte, nbEnvoyes, tauxAcceptation, nbRefuses }
  }, [filtered])

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('devis')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error("Erreur lors de l'archivage")
    } else {
      toast.success('Devis archive')
      setDevisList((prev) => prev.filter((d) => d.id !== id))
    }
  }

  const handleEnvoyer = async (id: string) => {
    setSendingId(id)
    try {
      const res = await fetch(`/api/devis/${id}/envoyer`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'envoi")
      } else if (data.warning) {
        toast.warning(data.warning)
        setDevisList((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, statut: 'envoye' as const } : d
          )
        )
      } else {
        toast.success('Devis envoye avec succes !')
        setDevisList((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, statut: 'envoye' as const } : d
          )
        )
      }
    } catch {
      toast.error("Erreur lors de l'envoi du devis")
    }
    setSendingId(null)
    setConfirmSendId(null)
  }

  const statutTabs = ['tous', 'brouillon', 'envoye', 'accepte', 'refuse'] as const

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#111827]">Devis</h1>
        <Link href="/devis/nouveau">
          <Button className="bg-[#17C2D7] hover:bg-[#14a8bc] text-white shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau devis
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total devis</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMontant(stats.totalDevis)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-[#059669]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Acceptes</span>
          </div>
          <p className="text-lg font-bold text-[#059669] tabular-nums">{formatMontant(stats.totalAccepte)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-[#D97706]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">En attente</span>
          </div>
          <p className="text-lg font-bold text-[#D97706] tabular-nums">{stats.nbEnvoyes}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-[#DC2626]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Refuses</span>
          </div>
          <p className="text-lg font-bold text-[#DC2626] tabular-nums">{stats.nbRefuses}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Taux acceptation</span>
          </div>
          <p className="text-lg font-bold text-[#7C3AED] tabular-nums">{stats.tauxAcceptation}%</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <Input
            placeholder="Rechercher un devis..."
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

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9CA3AF]">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucun devis trouve</p>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB]">
                <TableHead className="text-[#6B7280]">Numero</TableHead>
                <TableHead className="text-[#6B7280]">Client</TableHead>
                <TableHead className="hidden md:table-cell text-[#6B7280]">Titre</TableHead>
                <TableHead className="hidden md:table-cell text-[#6B7280]">Date</TableHead>
                <TableHead className="text-right hidden md:table-cell text-[#6B7280]">Montant HT</TableHead>
                <TableHead className="text-right text-[#6B7280]">Montant TTC</TableHead>
                <TableHead className="text-[#6B7280]">Statut</TableHead>
                <TableHead className="hidden md:table-cell text-[#6B7280]">Vues</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-[#F9FAFB]/50">
                  <TableCell>
                    <Link
                      href={`/devis/${d.id}`}
                      className="text-[13px] font-medium text-[#111827] hover:text-[#17C2D7] transition-colors"
                    >
                      {d.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#6B7280]">{getClientName(d)}</TableCell>
                  <TableCell className="hidden md:table-cell text-[#9CA3AF]">
                    {d.titre || '\u2014'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[#9CA3AF]">
                    {formatDate(d.date_devis)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden md:table-cell text-[#6B7280]">
                    {formatMontant(d.total_ht)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-[#111827]">
                    {formatMontant(d.total_ttc)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statutConfig[d.statut]?.className || ''}>
                      {statutConfig[d.statut]?.label || d.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {d.statut !== 'brouillon' ? (
                      <span className="inline-flex items-center gap-1 text-[13px] text-[#9CA3AF]">
                        <Eye className="h-3.5 w-3.5" />
                        {d.email_ouvertures || 0}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg h-8 w-8 hover:bg-[#F3F4F6] transition-colors duration-150">
                        <MoreHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="whitespace-nowrap">
                        <DropdownMenuItem
                          onClick={() => router.push(`/devis/${d.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Voir / Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.open(`/api/devis/${d.id}/pdf`, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Telecharger PDF
                        </DropdownMenuItem>
                        {(d.statut === 'brouillon' || d.statut === 'envoye') && (
                          <DropdownMenuItem
                            onClick={() => setConfirmSendId(d.id)}
                            disabled={sendingId === d.id}
                          >
                            {sendingId === d.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            {d.statut === 'envoye' ? 'Renvoyer' : 'Envoyer'}
                          </DropdownMenuItem>
                        )}
                        {(d.statut === 'accepte' || d.statut === 'envoye') && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/factures/nouveau?devis=${d.id}`)}
                          >
                            <FileOutput className="h-4 w-4 mr-2" />
                            Convertir en facture
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-[#DC2626]"
                          onClick={() => handleArchive(d.id)}
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

      {/* Confirmation dialog for sending */}
      <AlertDialog
        open={!!confirmSendId}
        onOpenChange={(open) => {
          if (!open) setConfirmSendId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le devis sera envoye par email au client avec un PDF et un lien de
              signature electronique. Le statut passera a Envoye.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmSendId && handleEnvoyer(confirmSendId)}
              disabled={!!sendingId}
              className="bg-[#17C2D7] hover:bg-[#14a8bc]"
            >
              {sendingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
