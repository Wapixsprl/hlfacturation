'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMontant } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  factureId: string
  entrepriseId: string
  soldeTTC: number
  onSuccess: () => void
}

const modesPaiement = [
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'cash', label: 'Espèces' },
  { value: 'carte', label: 'Carte' },
  { value: 'mollie', label: 'Mollie' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'autre', label: 'Autre' },
]

export function PaiementDialog({
  open,
  onOpenChange,
  factureId,
  entrepriseId,
  soldeTTC,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [datePaiement, setDatePaiement] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [montant, setMontant] = useState(soldeTTC)
  const [mode, setMode] = useState<string>('virement')
  const [referenceBancaire, setReferenceBancaire] = useState('')
  const [notes, setNotes] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (montant <= 0) {
      toast.error('Le montant doit être positif')
      return
    }

    setLoading(true)

    try {
      // Insert paiement
      const { error: paiementError } = await supabase
        .from('paiements_clients')
        .insert({
          entreprise_id: entrepriseId,
          facture_id: factureId,
          date_paiement: datePaiement,
          montant,
          mode,
          reference_bancaire: referenceBancaire || null,
          notes: notes || null,
        })

      if (paiementError) throw paiementError

      // Fetch all payments to compute total paid
      const { data: allPaiements } = await supabase
        .from('paiements_clients')
        .select('montant')
        .eq('facture_id', factureId)

      const totalPaye = (allPaiements || []).reduce(
        (sum, p) => sum + p.montant,
        0
      )

      // Get facture to check solde_ttc
      const { data: facture } = await supabase
        .from('factures')
        .select('solde_ttc')
        .eq('id', factureId)
        .single()

      const solde = facture?.solde_ttc || 0
      const round = (n: number) => Math.round(n * 100) / 100

      // Update facture statut
      let newStatut: string
      if (round(totalPaye) >= round(solde)) {
        newStatut = 'payee'
      } else {
        newStatut = 'partiellement_payee'
      }

      const { error: updateError } = await supabase
        .from('factures')
        .update({ statut: newStatut })
        .eq('id', factureId)

      if (updateError) throw updateError

      toast.success('Paiement enregistré')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'enregistrement du paiement")
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => onOpenChange(value)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Solde restant : <strong className="text-foreground">{formatMontant(soldeTTC)}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date du paiement *</Label>
            <Input
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Montant *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={montant}
              onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {modesPaiement.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Référence bancaire</Label>
            <Input
              value={referenceBancaire}
              onChange={(e) => setReferenceBancaire(e.target.value)}
              placeholder="Communication structurée..."
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-[#141414] hover:bg-[#141414]/90"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Enregistrer le paiement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
