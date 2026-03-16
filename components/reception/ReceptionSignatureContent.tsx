'use client'

import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'signature_pad'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle2, HardHat } from 'lucide-react'

interface Props {
  pv: {
    id: string
    observations: string | null
    reserves: { texte: string; resolu: boolean }[]
    photos_avant: string[]
    photos_apres: string[]
    date_reception: string
    chantier?: {
      id: string
      numero: string
      titre: string
      adresse: string | null
      ville: string | null
      client?: {
        nom: string | null
        prenom: string | null
        raison_sociale: string | null
        type: string
      }
    }
  }
  token: string
}

export function ReceptionSignatureContent({ pv, token }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  const [signed, setSigned] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(2, 2)
      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      })
    }
    return () => {
      signaturePadRef.current?.off()
    }
  }, [])

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError('Veuillez signer dans le cadre ci-dessus')
      return
    }

    setSigning(true)
    setError('')

    try {
      const res = await fetch(`/api/reception/${token}/signer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_image: signaturePadRef.current.toDataURL(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la signature')
      }

      setSigned(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la signature')
    } finally {
      setSigning(false)
    }
  }

  const clientName = pv.chantier?.client
    ? pv.chantier.client.type === 'professionnel' && pv.chantier.client.raison_sociale
      ? pv.chantier.client.raison_sociale
      : [pv.chantier.client.prenom, pv.chantier.client.nom].filter(Boolean).join(' ')
    : ''

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-emerald-600 mb-2">PV de réception signé</h1>
          <p className="text-[#6B7280]">
            Merci {clientName}. Le procès-verbal de réception du chantier {pv.chantier?.numero} a été signé avec succès.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <HardHat className="h-6 w-6 text-[#1B3A6B]" />
            <h1 className="text-xl font-bold text-[#1B3A6B]">HL Rénovation</h1>
          </div>
          <h2 className="text-lg font-semibold text-[#111827]">Procès-verbal de réception</h2>
          <p className="text-sm text-[#6B7280] mt-1">{pv.chantier?.numero} — {pv.chantier?.titre}</p>
        </div>

        {/* Chantier info */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#6B7280]">Client</p>
                <p className="font-medium text-[#111827]">{clientName}</p>
              </div>
              <div>
                <p className="text-[#6B7280]">Date de réception</p>
                <p className="font-medium text-[#111827]">{new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' }).format(new Date(pv.date_reception))}</p>
              </div>
              {(pv.chantier?.adresse || pv.chantier?.ville) && (
                <div className="col-span-2">
                  <p className="text-[#6B7280]">Adresse du chantier</p>
                  <p className="font-medium text-[#111827]">{[pv.chantier.adresse, pv.chantier.ville].filter(Boolean).join(', ')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Observations */}
        {pv.observations && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-[#111827] text-sm mb-2">Observations</h3>
              <p className="text-sm text-[#374151] whitespace-pre-wrap">{pv.observations}</p>
            </CardContent>
          </Card>
        )}

        {/* Reserves */}
        {pv.reserves && pv.reserves.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-[#111827] text-sm mb-3">Réserves</h3>
              <ul className="space-y-2">
                {pv.reserves.map((r: { texte: string; resolu: boolean }, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={r.resolu ? 'text-emerald-500' : 'text-amber-500'}>{r.resolu ? '\u2713' : '\u26A0'}</span>
                    <span className={r.resolu ? 'text-[#9CA3AF] line-through' : 'text-[#374151]'}>{r.texte}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Photos avant/après */}
        {((pv.photos_avant && pv.photos_avant.length > 0) || (pv.photos_apres && pv.photos_apres.length > 0)) && (
          <Card>
            <CardContent className="p-5 space-y-4">
              {pv.photos_avant && pv.photos_avant.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#111827] text-sm mb-2">Photos avant travaux</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {pv.photos_avant.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-[#F3F4F6]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {pv.photos_apres && pv.photos_apres.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#111827] text-sm mb-2">Photos après travaux</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {pv.photos_apres.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-[#F3F4F6]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Signature */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-[#111827] text-sm mb-3">Signature du client</h3>
            <p className="text-xs text-[#6B7280] mb-3">
              En signant ce document, vous confirmez la réception des travaux décrits ci-dessus.
            </p>
            <div className="border-2 border-dashed border-[#E2E8F0] rounded-lg mb-3">
              <canvas
                ref={canvasRef}
                className="w-full h-[200px] cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => signaturePadRef.current?.clear()}
                className="text-sm text-[#6B7280] hover:text-[#374151] underline"
              >
                Effacer
              </button>
              <Button
                onClick={handleSign}
                disabled={signing}
                className="bg-[#1B3A6B] hover:bg-[#152d54]"
              >
                {signing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signature en cours...</>
                ) : (
                  'Signer le PV de réception'
                )}
              </Button>
            </div>
            {error && <p className="text-sm text-[#DC2626] mt-2">{error}</p>}
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-[#9CA3AF]">
          HL Rénovation — Tournai, Belgique — Signature électronique simple (eIDAS)
        </p>
      </div>
    </div>
  )
}
