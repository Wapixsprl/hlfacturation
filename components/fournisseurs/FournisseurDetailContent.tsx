'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Fournisseur, FactureAchat } from '@/types/database'
import { formatMontant, formatDate } from '@/lib/utils'
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
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Receipt } from 'lucide-react'
import { FournisseurDialog } from './FournisseurDialog'
import { createClient } from '@/lib/supabase/client'

const statutConfig: Record<string, { label: string; className: string }> = {
  a_payer: { label: 'À payer', className: 'bg-[#FFFBEB] text-[#D97706]' },
  partiellement_paye: { label: 'Partiel', className: 'bg-[#EFF6FF] text-[#3B82F6]' },
  paye: { label: 'Payé', className: 'bg-[#F0FDF4] text-[#16A34A]' },
  en_retard: { label: 'En retard', className: 'bg-[#FEF2F2] text-[#DC2626]' },
}

const categorieLabels: Record<string, string> = {
  materiaux: 'Matériaux',
  sous_traitance: 'Sous-traitance',
  carburant: 'Carburant',
  assurance: 'Assurance',
  outillage: 'Outillage',
  telecom: 'Télécom',
  autre: 'Autre',
}

interface Props {
  fournisseur: Fournisseur
  facturesAchat: FactureAchat[]
}

export function FournisseurDetailContent({ fournisseur: initialFournisseur, facturesAchat }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fournisseur, setFournisseur] = useState(initialFournisseur)
  const supabase = createClient()

  const refreshFournisseur = async () => {
    const { data } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('id', fournisseur.id)
      .single()
    if (data) setFournisseur(data)
  }

  const totalFactures = facturesAchat.reduce((sum, f) => sum + f.total_ttc, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/fournisseurs')}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-[#141414] truncate">
            {fournisseur.raison_sociale}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </div>

      {/* Info card */}
      <div className="border border-[#EBEBEB]/60 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fournisseur.contact_nom && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-[#ADADAD] font-medium">Contact</span>
              <span className="text-[#707070]">{fournisseur.contact_nom}</span>
            </div>
          )}
          {fournisseur.email && (
            <div className="flex items-center gap-2 text-[13px]">
              <Mail className="h-4 w-4 text-[#ADADAD] shrink-0" />
              <span className="text-[#707070]">{fournisseur.email}</span>
            </div>
          )}
          {fournisseur.telephone && (
            <div className="flex items-center gap-2 text-[13px]">
              <Phone className="h-4 w-4 text-[#ADADAD] shrink-0" />
              <span className="text-[#707070]">{fournisseur.telephone}</span>
            </div>
          )}
          {(fournisseur.adresse || fournisseur.ville) && (
            <div className="flex items-center gap-2 text-[13px]">
              <MapPin className="h-4 w-4 text-[#ADADAD] shrink-0" />
              <span className="text-[#707070]">
                {[fournisseur.adresse, fournisseur.code_postal, fournisseur.ville]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
          {fournisseur.tva_numero && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-[#ADADAD] font-medium">TVA</span>
              <span className="text-[#707070]">{fournisseur.tva_numero}</span>
            </div>
          )}
          {fournisseur.iban && (
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-[#ADADAD] font-medium">IBAN</span>
              <span className="text-[#707070]">{fournisseur.iban}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="border border-[#EBEBEB]/60 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="h-4 w-4 text-[#ADADAD]" />
          <span className="text-[13px] text-[#707070]">
            {facturesAchat.length} facture{facturesAchat.length !== 1 ? 's' : ''} d&apos;achat
          </span>
        </div>
        <p className="text-lg font-semibold text-[#141414] tabular-nums">
          {formatMontant(totalFactures)}
        </p>
      </div>

      {/* Factures table */}
      <h2 className="text-[15px] font-semibold text-[#141414] mb-3">Factures d&apos;achat</h2>
      {facturesAchat.length === 0 ? (
        <div className="text-center py-12 text-[#ADADAD]">
          <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-[13px]">Aucune facture d&apos;achat pour ce fournisseur</p>
        </div>
      ) : (
        <div className="border border-[#EBEBEB]/60 rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facturesAchat.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Link
                      href={`/factures-achat/${f.id}`}
                      className="text-[13px] font-medium text-[#141414] hover:underline underline-offset-2"
                    >
                      {f.numero_fournisseur || '\u2014'}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[#707070]">{formatDate(f.date_facture)}</TableCell>
                  <TableCell className="hidden md:table-cell text-[#ADADAD]">
                    {categorieLabels[f.categorie] || f.categorie}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-[#141414]">
                    {formatMontant(f.total_ttc)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statutConfig[f.statut]?.className || ''}>
                      {statutConfig[f.statut]?.label || f.statut}
                    </Badge>
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
        fournisseur={fournisseur}
        onSuccess={() => {
          refreshFournisseur()
          router.refresh()
        }}
      />
    </div>
  )
}
