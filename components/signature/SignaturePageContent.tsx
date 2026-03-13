'use client'

import { useRef, useState, useCallback } from 'react'
import SignaturePad from 'signature_pad'
import type { Devis, DevisLigne, AcompteConfig } from '@/types/database'
import { formatMontant } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  devis: Devis & {
    client: { nom: string | null; prenom: string | null; raison_sociale: string | null; type: string; email: string | null } | null
    entreprise: { nom: string; adresse: string | null; code_postal: string | null; ville: string | null; telephone: string | null; email: string | null; tva_numero: string | null; conditions_generales_vente: string | null } | null
  }
  lignes: DevisLigne[]
  token: string
}

const fmtPct = (n: number) => n.toFixed(2).replace('.', ',') + ' %'

export function SignaturePageContent({ devis, lignes, token }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sigPadRef = useRef<SignaturePad | null>(null)
  const [signed, setSigned] = useState(false)
  const [refused, setRefused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refuseLoading, setRefuseLoading] = useState(false)
  const [showRefuseConfirm, setShowRefuseConfirm] = useState(false)
  const [cgvAccepted, setCgvAccepted] = useState(false)
  const [showCgv, setShowCgv] = useState(false)

  const hasCgv = !!(devis.entreprise?.conditions_generales_vente)

  const initSignaturePad = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return
    canvasRef.current = canvas
    sigPadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
    })
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext('2d')?.scale(ratio, ratio)
  }, [])

  const clearSignature = () => {
    sigPadRef.current?.clear()
  }

  const handleSign = async () => {
    if (hasCgv && !cgvAccepted) {
      toast.error('Veuillez accepter les conditions generales de vente')
      return
    }
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      toast.error('Veuillez signer dans le cadre ci-dessous')
      return
    }

    setLoading(true)
    const signatureImage = sigPadRef.current.toDataURL('image/png')

    try {
      const res = await fetch(`/api/devis/${token}/signer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_image: signatureImage,
          cgv_acceptees: cgvAccepted,
        }),
      })

      if (!res.ok) throw new Error('Erreur')
      setSigned(true)
      toast.success('Devis signe avec succes !')
    } catch {
      toast.error('Erreur lors de la signature')
    }
    setLoading(false)
  }

  const handleRefuse = async () => {
    setRefuseLoading(true)
    try {
      const res = await fetch(`/api/devis/${token}/refuser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Erreur')
      setRefused(true)
      toast.success('Devis refuse')
    } catch {
      toast.error('Erreur lors du refus du devis')
    }
    setRefuseLoading(false)
  }

  if (refused) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Devis refuse</h1>
          <p className="text-muted-foreground">Le devis <strong>{devis.numero}</strong> a ete refuse. HL Renovation en a ete informe.</p>
        </div>
      </div>
    )
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Merci !</h1>
          <p className="text-muted-foreground">Le devis <strong>{devis.numero}</strong> a ete signe et accepte. Vous recevrez une confirmation par email.</p>
        </div>
      </div>
    )
  }

  const clientName = devis.client?.type === 'professionnel' && devis.client?.raison_sociale
    ? devis.client.raison_sociale
    : [devis.client?.prenom, devis.client?.nom].filter(Boolean).join(' ')

  const companyAddress = [devis.entreprise?.adresse, devis.entreprise?.code_postal, devis.entreprise?.ville].filter(Boolean).join(', ')

  // TVA groupes
  const produitLignes = lignes.filter((l) => l.type === 'produit')
  const tvaGroups: Record<number, { baseHT: number; montantTVA: number }> = {}
  for (const l of produitLignes) {
    if (!tvaGroups[l.taux_tva]) tvaGroups[l.taux_tva] = { baseHT: 0, montantTVA: 0 }
    tvaGroups[l.taux_tva].baseHT += l.total_ht
    tvaGroups[l.taux_tva].montantTVA += l.total_ht * (l.taux_tva / 100)
  }

  // Acomptes
  const acomptes = (devis.acomptes_config || []) as AcompteConfig[]
  const totalPctAcomptes = acomptes.reduce((s, a) => s + a.pourcentage, 0)
  const soldePct = Math.max(0, 100 - totalPctAcomptes)

  const round = (n: number) => Math.round(n * 100) / 100

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 px-4">
      <div className="max-w-[800px] mx-auto">

        {/* === PDF-style document === */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">

          {/* Header */}
          <div className="p-8 pb-0">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-xl font-bold text-[#1a1a1a]">{devis.entreprise?.nom || 'HL Renovation'}</h1>
                <p className="text-[13px] text-[#555] mt-1">{companyAddress}</p>
                {devis.entreprise?.telephone && <p className="text-[13px] text-[#555]">Tel: {devis.entreprise.telephone}</p>}
                {devis.entreprise?.email && <p className="text-[13px] text-[#555]">{devis.entreprise.email}</p>}
                {devis.entreprise?.tva_numero && <p className="text-[13px] text-[#555]">TVA: {devis.entreprise.tva_numero}</p>}
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#1a1a1a]">DEVIS</span>
              </div>
            </div>

            {/* Meta + Client blocks */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#fafafa] rounded p-4">
                <p className="text-[11px] font-bold text-[#888] uppercase tracking-wide mb-2">Devis</p>
                <div className="space-y-1 text-[13px]">
                  <div className="flex gap-2"><span className="font-semibold text-[#555] w-28">Numero :</span><span>{devis.numero}</span></div>
                  <div className="flex gap-2"><span className="font-semibold text-[#555] w-28">Date :</span><span>{new Date(devis.date_devis).toLocaleDateString('fr-BE')}</span></div>
                  {devis.date_validite && <div className="flex gap-2"><span className="font-semibold text-[#555] w-28">Valable jusqu{"'"}au :</span><span>{new Date(devis.date_validite).toLocaleDateString('fr-BE')}</span></div>}
                  {devis.reference_chantier && <div className="flex gap-2"><span className="font-semibold text-[#555] w-28">Ref. chantier :</span><span>{devis.reference_chantier}</span></div>}
                  {devis.titre && <div className="flex gap-2"><span className="font-semibold text-[#555] w-28">Objet :</span><span>{devis.titre}</span></div>}
                </div>
              </div>
              <div className="bg-[#fafafa] rounded p-4">
                <p className="text-[11px] font-bold text-[#888] uppercase tracking-wide mb-2">Client</p>
                <p className="text-[14px] font-bold mb-1">{clientName}</p>
                {devis.client?.email && <p className="text-[13px] text-[#555]">{devis.client.email}</p>}
              </div>
            </div>
          </div>

          {/* Introduction */}
          {devis.introduction && (
            <div className="px-8 mb-4">
              <p className="text-[13px] text-[#333] leading-relaxed">{devis.introduction}</p>
            </div>
          )}

          {/* Lines table */}
          <div className="px-8 mb-6">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#1a1a1a] text-white">
                  <th className="text-left py-2 px-3 text-[11px] font-bold uppercase">Designation</th>
                  <th className="text-right py-2 px-3 text-[11px] font-bold uppercase">Qte</th>
                  <th className="text-right py-2 px-3 text-[11px] font-bold uppercase">PU HT</th>
                  <th className="text-right py-2 px-3 text-[11px] font-bold uppercase">Remise</th>
                  <th className="text-right py-2 px-3 text-[11px] font-bold uppercase">TVA</th>
                  <th className="text-right py-2 px-3 text-[11px] font-bold uppercase">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => {
                  if (l.type === 'section') {
                    return (
                      <tr key={l.id} className="bg-[#f0f0f0]">
                        <td colSpan={6} className="py-2 px-3 font-bold">{l.designation}</td>
                      </tr>
                    )
                  }
                  if (l.type === 'texte') {
                    return (
                      <tr key={l.id}>
                        <td colSpan={6} className="py-2 px-3 italic text-[#555]">{l.designation}</td>
                      </tr>
                    )
                  }
                  if (l.type !== 'produit') return null
                  return (
                    <tr key={l.id} className={`border-b border-[#e5e5e5] ${i % 2 === 1 ? 'bg-[#fafafa]' : ''}`}>
                      <td className="py-2 px-3">
                        <p>{l.designation}</p>
                        {l.description && <p className="text-[11px] text-[#777] mt-0.5">{l.description}</p>}
                      </td>
                      <td className="text-right py-2 px-3 tabular-nums">{l.quantite}</td>
                      <td className="text-right py-2 px-3 tabular-nums">{formatMontant(l.prix_unitaire_ht)}</td>
                      <td className="text-right py-2 px-3 tabular-nums">{l.remise_pct > 0 ? fmtPct(l.remise_pct) : '-'}</td>
                      <td className="text-right py-2 px-3 tabular-nums">{fmtPct(l.taux_tva)}</td>
                      <td className="text-right py-2 px-3 font-bold tabular-nums">{formatMontant(l.total_ht)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* TVA Recap */}
          {Object.keys(tvaGroups).length > 0 && (
            <div className="px-8 mb-4">
              <p className="text-[11px] font-bold text-[#555] uppercase mb-2">Recapitulatif TVA</p>
              {Object.entries(tvaGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([taux, group]) => (
                <div key={taux} className="flex justify-end gap-6 text-[13px] py-0.5">
                  <span className="text-[#555]">Base HT ({fmtPct(Number(taux))}) : {formatMontant(round(group.baseHT))}</span>
                  <span className="text-[#555]">TVA : {formatMontant(round(group.montantTVA))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="px-8 mb-6">
            <div className="flex flex-col items-end">
              <div className="flex justify-between w-56 py-1 text-[14px]">
                <span className="text-[#555]">Total HT</span>
                <span className="font-bold tabular-nums">{formatMontant(devis.total_ht)}</span>
              </div>
              <div className="flex justify-between w-56 py-1 text-[14px]">
                <span className="text-[#555]">Total TVA</span>
                <span className="font-bold tabular-nums">{formatMontant(devis.total_tva)}</span>
              </div>
              <div className="flex justify-between w-56 py-2 text-[18px] font-bold border-t-2 border-[#1a1a1a] mt-1">
                <span>Total TTC</span>
                <span className="tabular-nums">{formatMontant(devis.total_ttc)}</span>
              </div>
            </div>
          </div>

          {/* Acomptes schedule */}
          {acomptes.length > 0 && (
            <div className="px-8 mb-6">
              <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded p-4">
                <p className="font-bold text-[14px] mb-3">Echeancier de paiement</p>
                {acomptes.map((a, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-[#e5e5e5] text-[13px]">
                    <span className="text-[#555]">{a.label || `Acompte ${i + 1}`}</span>
                    <div className="flex gap-4">
                      <span className="text-[#555]">{a.pourcentage}%</span>
                      <span className="font-bold tabular-nums">{formatMontant(round(devis.total_ttc * (a.pourcentage / 100)))}</span>
                    </div>
                  </div>
                ))}
                {soldePct > 0 && (
                  <div className="flex justify-between py-1.5 mt-1 text-[13px]">
                    <span className="font-bold">Solde a la fin des travaux</span>
                    <div className="flex gap-4">
                      <span className="text-[#555]">{soldePct}%</span>
                      <span className="font-bold tabular-nums">{formatMontant(round(devis.total_ttc * (soldePct / 100)))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conclusion */}
          {devis.conclusion && (
            <div className="px-8 mb-6">
              <p className="text-[13px] text-[#333] leading-relaxed">{devis.conclusion}</p>
            </div>
          )}

          {/* Conditions */}
          {devis.conditions_paiement && (
            <div className="px-8 mb-6">
              <div className="bg-[#fafafa] rounded p-4">
                <p className="text-[11px] font-bold text-[#555] uppercase mb-2">Conditions de paiement</p>
                <p className="text-[13px] text-[#555]">{devis.conditions_paiement}</p>
              </div>
            </div>
          )}

          {/* CGV Section */}
          {hasCgv && (
            <div className="px-8 mb-6">
              <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#f9fafb] hover:bg-[#f0f0f0] transition-colors"
                  onClick={() => setShowCgv(!showCgv)}
                >
                  <span className="text-[14px] font-semibold text-[#1a1a1a]">Conditions generales de vente</span>
                  {showCgv ? <ChevronUp className="h-5 w-5 text-[#555]" /> : <ChevronDown className="h-5 w-5 text-[#555]" />}
                </button>
                {showCgv && (
                  <div className="px-4 py-4 max-h-[400px] overflow-y-auto border-t border-[#e5e7eb]">
                    <pre className="text-[12px] text-[#555] leading-relaxed whitespace-pre-wrap font-sans">
                      {devis.entreprise?.conditions_generales_vente}
                    </pre>
                  </div>
                )}
              </div>
              <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cgvAccepted}
                  onChange={(e) => setCgvAccepted(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-[#d1d5db] text-[#17C2D7] focus:ring-[#17C2D7] cursor-pointer"
                />
                <span className="text-[13px] text-[#1a1a1a]">
                  J{"'"}ai lu et j{"'"}accepte les conditions generales de vente *
                </span>
              </label>
            </div>
          )}

          {/* Signature pad */}
          <div className="px-8 pb-8">
            <div className="border border-[#e5e7eb] rounded-lg p-6">
              <h2 className="text-[16px] font-bold mb-2">Signature</h2>
              <p className="text-[13px] text-[#555] mb-4">
                En signant ci-dessous, vous acceptez les termes de ce devis{hasCgv ? ' et les conditions generales de vente' : ''}.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4">
                <canvas
                  ref={initSignaturePad}
                  className="w-full"
                  style={{ height: '200px' }}
                />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                  Effacer
                </Button>
                <Button
                  onClick={handleSign}
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
                  disabled={loading || (hasCgv && !cgvAccepted)}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Accepter et signer
                </Button>
              </div>

              {/* Refuser le devis */}
              <div className="mt-6 pt-4 border-t border-[#e5e7eb]">
                {!showRefuseConfirm ? (
                  <button
                    type="button"
                    className="text-[13px] text-[#9CA3AF] hover:text-red-500 transition-colors underline underline-offset-2 cursor-pointer"
                    onClick={() => setShowRefuseConfirm(true)}
                  >
                    Je souhaite refuser ce devis
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-[14px] font-medium text-red-800 mb-2">Confirmer le refus du devis ?</p>
                    <p className="text-[13px] text-red-600 mb-4">Cette action est definitive. HL Renovation sera informe de votre decision.</p>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRefuseConfirm(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleRefuse}
                        disabled={refuseLoading}
                      >
                        {refuseLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Confirmer le refus
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#ddd] px-8 py-4 text-center text-[11px] text-[#aaa]">
            {devis.entreprise?.nom}{devis.entreprise?.tva_numero ? ` - TVA: ${devis.entreprise.tva_numero}` : ''} - {companyAddress}
          </div>
        </div>
      </div>
    </div>
  )
}
