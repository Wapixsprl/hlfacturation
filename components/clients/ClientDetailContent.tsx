'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Client, Devis, Facture } from '@/types/database'
import { formatMontant, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  FileText,
  Receipt,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FileMinus,
  Clock,
  Truck,
  Building2,
} from 'lucide-react'
import { ClientDialog } from './ClientDialog'
import { createClient } from '@/lib/supabase/client'

const statutDevisConfig: Record<string, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-[#F5F5F5] text-[#707070]' },
  envoye: { label: 'Envoye', className: 'bg-[#EFF6FF] text-[#3B82F6]' },
  accepte: { label: 'Accepte', className: 'bg-[#D1FAE5] text-[#059669]' },
  refuse: { label: 'Refuse', className: 'bg-[#FEE2E2] text-[#DC2626]' },
  expire: { label: 'Expire', className: 'bg-[#FEF3C7] text-[#D97706]' },
  converti: { label: 'Converti', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
}

const statutFactureConfig: Record<string, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-[#F5F5F5] text-[#707070]' },
  envoyee: { label: 'Envoyee', className: 'bg-[#EFF6FF] text-[#3B82F6]' },
  partiellement_payee: { label: 'Partiel', className: 'bg-[#FEF3C7] text-[#D97706]' },
  payee: { label: 'Payee', className: 'bg-[#D1FAE5] text-[#059669]' },
  en_retard: { label: 'En retard', className: 'bg-[#FEE2E2] text-[#DC2626]' },
}

const typeFactureConfig: Record<string, { label: string; className: string }> = {
  facture: { label: 'Facture', className: 'bg-[#17C2D7]/10 text-[#17C2D7]' },
  acompte: { label: 'Acompte', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
  avoir: { label: 'Avoir', className: 'bg-[#FEE2E2] text-[#DC2626]' },
  situation: { label: 'Situation', className: 'bg-[#FEF3C7] text-[#D97706]' },
}

interface Props {
  client: Client
  devis: Devis[]
  factures: Facture[]
  paiementsMap: Record<string, number>
}

export function ClientDetailContent({ client: initialClient, devis, factures, paiementsMap }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [client, setClient] = useState(initialClient)
  const supabase = createClient()

  const displayName =
    client.type === 'professionnel' && client.raison_sociale
      ? client.raison_sociale
      : [client.prenom, client.nom].filter(Boolean).join(' ') || '\u2014'

  const refreshClient = async () => {
    const { data } = await supabase.from('clients').select('*').eq('id', client.id).single()
    if (data) setClient(data)
  }

  // Separate factures and avoirs
  const facturesOnly = factures.filter((f) => f.type !== 'avoir')
  const avoirs = factures.filter((f) => f.type === 'avoir')

  // Financial statistics
  const stats = useMemo(() => {
    // CA = total TTC of all factures (excl. avoirs)
    const caTotal = facturesOnly.reduce((sum, f) => sum + f.total_ttc, 0)
    // Total avoirs
    const totalAvoirs = avoirs.reduce((sum, f) => sum + f.total_ttc, 0)
    // Total paye = sum of paiements
    const totalPaye = Object.values(paiementsMap).reduce((sum, m) => sum + m, 0)
    // En souffrance = factures non brouillon, non payees
    const enSouffrance = facturesOnly
      .filter((f) => f.statut === 'envoyee' || f.statut === 'partiellement_payee' || f.statut === 'en_retard')
      .reduce((sum, f) => sum + (f.solde_ttc || f.total_ttc), 0)
    // Nb en retard
    const nbEnRetard = facturesOnly.filter((f) => f.statut === 'en_retard').length
    // Total devis
    const totalDevis = devis.reduce((sum, d) => sum + d.total_ttc, 0)

    return { caTotal, totalAvoirs, totalPaye, enSouffrance, nbEnRetard, totalDevis }
  }, [facturesOnly, avoirs, paiementsMap, devis])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/clients')}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#111827] truncate">{displayName}</h1>
            <Badge
              className={
                client.type === 'professionnel'
                  ? 'bg-[#1E2028] text-white'
                  : 'bg-[#17C2D7]/10 text-[#17C2D7]'
              }
            >
              {client.type === 'professionnel' ? 'Pro' : 'Particulier'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </div>

      {/* Info card */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {client.email && (
            <div className="flex items-center gap-2 text-[13px]">
              <Mail className="h-4 w-4 text-[#9CA3AF] shrink-0" />
              <span className="text-[#6B7280]">{client.email}</span>
            </div>
          )}
          {client.telephone && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone className="h-4 w-4 text-[#9CA3AF] shrink-0" />
              <span className="text-[#6B7280]">{client.telephone}</span>
            </div>
          )}
          {client.telephone2 && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone className="h-4 w-4 text-[#9CA3AF] shrink-0" />
              <span className="text-[#6B7280]">{client.telephone2}</span>
            </div>
          )}
          {(client.adresse || client.ville) && (
            <div className="flex items-center gap-2 text-[13px]">
              <MapPin className="h-4 w-4 text-[#9CA3AF] shrink-0" />
              <span className="text-[#6B7280]">
                {[client.adresse, client.code_postal, client.ville].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {client.tva_numero && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-[#9CA3AF] font-medium">TVA</span>
              <span className="text-[#6B7280]">{client.tva_numero}</span>
              {client.tva_valide && (
                <Badge className="bg-[#D1FAE5] text-[#059669] text-[11px]">Valide</Badge>
              )}
            </div>
          )}
          {client.iban && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-[#9CA3AF] font-medium">IBAN</span>
              <span className="text-[#6B7280]">{client.iban}</span>
            </div>
          )}
          {/* Adresse de facturation */}
          {(client.adresse_facturation || client.ville_facturation) && (
            <div className="flex items-center gap-2 text-[13px]">
              <Building2 className="h-4 w-4 text-[#9CA3AF] shrink-0" />
              <span className="text-[#6B7280]">
                <span className="text-[#9CA3AF] font-medium">Facturation : </span>
                {[client.adresse_facturation, client.code_postal_facturation, client.ville_facturation].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {/* Adresse de livraison */}
          {(client.adresse_livraison || client.ville_livraison) && (
            <div className="flex items-center gap-2 text-[13px]">
              <Truck className="h-4 w-4 text-[#9CA3AF] shrink-0" />
              <span className="text-[#6B7280]">
                <span className="text-[#9CA3AF] font-medium">Livraison : </span>
                {[client.adresse_livraison, client.code_postal_livraison, client.ville_livraison].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
          {client.notes && (
            <div className="col-span-full text-[13px] text-[#6B7280] border-t border-[#E5E7EB] pt-3 mt-1">
              <span className="text-[#9CA3AF] font-medium">Notes :</span> {client.notes}
            </div>
          )}
        </div>
      </div>

      {/* Financial Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-[#17C2D7]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">CA total</span>
          </div>
          <p className="text-lg font-bold text-[#111827] tabular-nums">{formatMontant(stats.caTotal)}</p>
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
            <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">En souffrance</span>
          </div>
          <p className="text-lg font-bold text-[#DC2626] tabular-nums">{formatMontant(stats.enSouffrance)}</p>
          {stats.nbEnRetard > 0 && (
            <p className="text-[11px] text-[#DC2626] mt-0.5">{stats.nbEnRetard} en retard</p>
          )}
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileMinus className="h-4 w-4 text-[#D97706]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Avoirs</span>
          </div>
          <p className="text-lg font-bold text-[#D97706] tabular-nums">{formatMontant(stats.totalAvoirs)}</p>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-[#7C3AED]" />
            <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">Total devis</span>
          </div>
          <p className="text-lg font-bold text-[#7C3AED] tabular-nums">{formatMontant(stats.totalDevis)}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="devis">
        <TabsList>
          <TabsTrigger value="devis">Devis ({devis.length})</TabsTrigger>
          <TabsTrigger value="factures">Factures ({facturesOnly.length})</TabsTrigger>
          <TabsTrigger value="avoirs">Avoirs ({avoirs.length})</TabsTrigger>
        </TabsList>

        {/* DEVIS TAB */}
        <TabsContent value="devis" className="mt-4">
          {devis.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-[13px]">Aucun devis pour ce client</p>
            </div>
          ) : (
            <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="text-[#6B7280]">Numero</TableHead>
                    <TableHead className="hidden md:table-cell text-[#6B7280]">Titre</TableHead>
                    <TableHead className="text-[#6B7280]">Date</TableHead>
                    <TableHead className="text-right text-[#6B7280]">Montant TTC</TableHead>
                    <TableHead className="text-[#6B7280]">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devis.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-[#F9FAFB]/50"
                      onClick={() => router.push(`/devis/${d.id}`)}
                    >
                      <TableCell className="font-medium text-[#111827]">{d.numero}</TableCell>
                      <TableCell className="hidden md:table-cell text-[#9CA3AF]">
                        {d.titre || '\u2014'}
                      </TableCell>
                      <TableCell className="text-[#6B7280]">{formatDate(d.date_devis)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[#111827]">
                        {formatMontant(d.total_ttc)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statutDevisConfig[d.statut]?.className || ''}>
                          {statutDevisConfig[d.statut]?.label || d.statut}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* FACTURES TAB */}
        <TabsContent value="factures" className="mt-4">
          {facturesOnly.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-[13px]">Aucune facture pour ce client</p>
            </div>
          ) : (
            <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="text-[#6B7280]">Numero</TableHead>
                    <TableHead className="text-[#6B7280]">Type</TableHead>
                    <TableHead className="text-[#6B7280]">Date</TableHead>
                    <TableHead className="text-right text-[#6B7280]">Montant TTC</TableHead>
                    <TableHead className="hidden md:table-cell text-right text-[#6B7280]">Paye</TableHead>
                    <TableHead className="text-[#6B7280]">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturesOnly.map((f) => {
                    const paye = paiementsMap[f.id] || 0
                    return (
                      <TableRow
                        key={f.id}
                        className="cursor-pointer hover:bg-[#F9FAFB]/50"
                        onClick={() => router.push(`/factures/${f.id}`)}
                      >
                        <TableCell className="font-medium text-[#111827]">{f.numero}</TableCell>
                        <TableCell>
                          <Badge className={typeFactureConfig[f.type]?.className || ''}>
                            {typeFactureConfig[f.type]?.label || f.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#6B7280]">{formatDate(f.date_facture)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-[#111827]">
                          {formatMontant(f.total_ttc)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums">
                          {paye > 0 ? (
                            <span className="text-[#059669] font-medium">{formatMontant(paye)}</span>
                          ) : (
                            <span className="text-[#9CA3AF]">{'\u2014'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statutFactureConfig[f.statut]?.className || ''}>
                            {statutFactureConfig[f.statut]?.label || f.statut}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* AVOIRS TAB */}
        <TabsContent value="avoirs" className="mt-4">
          {avoirs.length === 0 ? (
            <div className="text-center py-12 text-[#9CA3AF]">
              <FileMinus className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-[13px]">Aucun avoir pour ce client</p>
            </div>
          ) : (
            <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F9FAFB]">
                    <TableHead className="text-[#6B7280]">Numero</TableHead>
                    <TableHead className="text-[#6B7280]">Date</TableHead>
                    <TableHead className="text-right text-[#6B7280]">Montant TTC</TableHead>
                    <TableHead className="text-[#6B7280]">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avoirs.map((f) => (
                    <TableRow
                      key={f.id}
                      className="cursor-pointer hover:bg-[#F9FAFB]/50"
                      onClick={() => router.push(`/factures/${f.id}`)}
                    >
                      <TableCell className="font-medium text-[#111827]">{f.numero}</TableCell>
                      <TableCell className="text-[#6B7280]">{formatDate(f.date_facture)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-[#DC2626]">
                        -{formatMontant(f.total_ttc)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statutFactureConfig[f.statut]?.className || ''}>
                          {statutFactureConfig[f.statut]?.label || f.statut}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={client}
        onSuccess={() => {
          refreshClient()
          router.refresh()
        }}
      />
    </div>
  )
}
