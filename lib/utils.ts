import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatMontant = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

export const formatDate = (d: string | Date) =>
  new Intl.DateTimeFormat('fr-BE', { dateStyle: 'short' }).format(new Date(d))

export const formatDateLong = (d: string | Date) =>
  new Intl.DateTimeFormat('fr-BE', { dateStyle: 'long' }).format(new Date(d))

export function calculerLigne(
  q: number,
  pu: number,
  remise: number,
  tva: number,
  remiseType: 'pct' | 'montant' = 'pct'
) {
  const brut = q * pu
  const ht = remiseType === 'montant'
    ? Math.max(0, brut - remise)
    : brut * (1 - remise / 100)
  const tvaMontant = ht * (tva / 100)
  const round = (n: number) => Math.round(n * 100) / 100
  return { ht: round(ht), tva: round(tvaMontant), ttc: round(ht + tvaMontant) }
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
}

export function calculerTotaux(lignes: Array<{ total_ht: number; taux_tva: number }>) {
  const totalHT = lignes.reduce((sum, l) => sum + l.total_ht, 0)
  const totalTVA = lignes.reduce((sum, l) => sum + l.total_ht * (l.taux_tva / 100), 0)
  const round = (n: number) => Math.round(n * 100) / 100
  return { totalHT: round(totalHT), totalTVA: round(totalTVA), totalTTC: round(totalHT + totalTVA) }
}

export function calculerTotauxAvecRemiseGlobale(
  lignes: Array<{ total_ht: number; taux_tva: number }>,
  remiseGlobaleType: 'pct' | 'montant',
  remiseGlobaleValeur: number
) {
  const round = (n: number) => Math.round(n * 100) / 100
  const sousTotal = lignes.reduce((sum, l) => sum + l.total_ht, 0)
  const remiseMontant = remiseGlobaleType === 'montant'
    ? Math.min(remiseGlobaleValeur, sousTotal)
    : sousTotal * remiseGlobaleValeur / 100
  const ratio = sousTotal > 0 ? (sousTotal - remiseMontant) / sousTotal : 1
  const totalHT = sousTotal - remiseMontant
  const totalTVA = lignes.reduce((sum, l) => sum + l.total_ht * (l.taux_tva / 100), 0) * ratio
  return {
    sousTotal: round(sousTotal),
    remiseMontant: round(remiseMontant),
    totalHT: round(totalHT),
    totalTVA: round(totalTVA),
    totalTTC: round(totalHT + totalTVA),
  }
}

/**
 * Determine si un client est soumis a l'exoneration TVA intracommunautaire.
 * Condition : client pro + TVA commencant par FR + pays = FR
 * Mention legale : "Exoneration – art. 138 par.1 de la directive TVA"
 */
export function isExonerationIntracom(client: {
  type?: string | null
  tva_numero?: string | null
  pays?: string | null
}): boolean {
  if (client.type !== 'professionnel') return false
  if (!client.tva_numero) return false
  const prefix = client.tva_numero.replace(/[\s.]/g, '').substring(0, 2).toUpperCase()
  const pays = (client.pays || 'BE').toUpperCase()
  // Exoneration pour livraison intracommunautaire (hors Belgique)
  return prefix === 'FR' && pays === 'FR'
}

export const MENTION_EXONERATION_INTRACOM = 'Exoneration \u2013 art. 138 par.1 de la directive TVA'

/**
 * Format client display name — shared utility to avoid duplication
 */
export function formatClientName(client: {
  type?: string | null
  nom?: string | null
  prenom?: string | null
  raison_sociale?: string | null
}): string {
  if (client.type === 'professionnel' && client.raison_sociale) {
    return client.raison_sociale
  }
  return [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'
}
