import { describe, it, expect } from 'vitest'
import {
  calculerLigne,
  calculerTotaux,
  calculerTotauxAvecRemiseGlobale,
  formatClientName,
  isExonerationIntracom,
} from '@/lib/utils'

// ─── calculerLigne ────────────────────────────────────────────────────────────

describe('calculerLigne', () => {
  it('calcule HT, TVA et TTC sans remise', () => {
    const result = calculerLigne(2, 100, 0, 21)
    expect(result.ht).toBe(200)
    expect(result.tva).toBe(42)
    expect(result.ttc).toBe(242)
  })

  it('applique une remise en pourcentage', () => {
    const result = calculerLigne(1, 200, 10, 21)
    expect(result.ht).toBe(180)    // 200 - 10%
    expect(result.tva).toBe(37.8)  // 180 * 21%
    expect(result.ttc).toBe(217.8)
  })

  it('arrondit à 2 décimales', () => {
    // 1 * 99.99 * 21% = 20.9979 → 21
    const result = calculerLigne(1, 99.99, 0, 21)
    expect(result.tva).toBe(21)
    expect(result.ttc).toBe(120.99)
  })

  it('retourne zéro si quantité nulle', () => {
    const result = calculerLigne(0, 150, 0, 21)
    expect(result.ht).toBe(0)
    expect(result.tva).toBe(0)
    expect(result.ttc).toBe(0)
  })

  it('gère la TVA à 6% (travaux réno résidentielle BE)', () => {
    const result = calculerLigne(1, 1000, 0, 6)
    expect(result.ht).toBe(1000)
    expect(result.tva).toBe(60)
    expect(result.ttc).toBe(1060)
  })

  it('gère remise 100% → tout à zéro', () => {
    const result = calculerLigne(5, 200, 100, 21)
    expect(result.ht).toBe(0)
    expect(result.tva).toBe(0)
    expect(result.ttc).toBe(0)
  })

  it('applique une remise en montant fixe (remiseType=montant)', () => {
    // 2 * 100 = 200 brut, remise 20€ → HT = 180
    const result = calculerLigne(2, 100, 20, 21, 'montant')
    expect(result.ht).toBe(180)
    expect(result.tva).toBe(37.8)
    expect(result.ttc).toBe(217.8)
  })

  it('remise montant ne peut pas dépasser le brut → HT = 0', () => {
    const result = calculerLigne(1, 50, 999, 21, 'montant')
    expect(result.ht).toBe(0)
    expect(result.tva).toBe(0)
    expect(result.ttc).toBe(0)
  })

  it('remiseType=pct par défaut si non précisé', () => {
    const withDefault = calculerLigne(1, 100, 10, 21)
    const withExplicit = calculerLigne(1, 100, 10, 21, 'pct')
    expect(withDefault.ht).toBe(withExplicit.ht)
  })
})

// ─── calculerTotaux ───────────────────────────────────────────────────────────

describe('calculerTotaux', () => {
  it('additionne plusieurs lignes avec TVA mixte', () => {
    const lignes = [
      { total_ht: 1000, taux_tva: 21 },
      { total_ht: 500,  taux_tva: 6 },
    ]
    const result = calculerTotaux(lignes)
    expect(result.totalHT).toBe(1500)
    expect(result.totalTVA).toBe(240)  // 210 + 30
    expect(result.totalTTC).toBe(1740)
  })

  it('retourne zéros pour liste vide', () => {
    const result = calculerTotaux([])
    expect(result.totalHT).toBe(0)
    expect(result.totalTVA).toBe(0)
    expect(result.totalTTC).toBe(0)
  })

  it('arrondit le total TVA à 2 décimales', () => {
    // 99.99 * 21% = 20.9979 → 21
    const lignes = [{ total_ht: 99.99, taux_tva: 21 }]
    const result = calculerTotaux(lignes)
    expect(result.totalTVA).toBe(21)
  })
})

// ─── calculerTotauxAvecRemiseGlobale ─────────────────────────────────────────

describe('calculerTotauxAvecRemiseGlobale', () => {
  const lignes = [
    { total_ht: 1000, taux_tva: 21 },
    { total_ht: 500,  taux_tva: 6 },
  ]

  it('sans remise globale → identique à calculerTotaux', () => {
    const result = calculerTotauxAvecRemiseGlobale(lignes, 'pct', 0)
    expect(result.sousTotal).toBe(1500)
    expect(result.remiseMontant).toBe(0)
    expect(result.totalHT).toBe(1500)
    expect(result.totalTVA).toBe(240)   // 210 + 30
    expect(result.totalTTC).toBe(1740)
  })

  it('remise globale en pourcentage (10%)', () => {
    const result = calculerTotauxAvecRemiseGlobale(lignes, 'pct', 10)
    expect(result.sousTotal).toBe(1500)
    expect(result.remiseMontant).toBe(150)
    expect(result.totalHT).toBe(1350)
    expect(result.totalTVA).toBe(216)   // 240 * 0.9
    expect(result.totalTTC).toBe(1566)
  })

  it('remise globale en montant fixe (300€)', () => {
    const result = calculerTotauxAvecRemiseGlobale(lignes, 'montant', 300)
    expect(result.sousTotal).toBe(1500)
    expect(result.remiseMontant).toBe(300)
    expect(result.totalHT).toBe(1200)
    expect(result.totalTTC).toBe(result.totalHT + result.totalTVA)
  })

  it('remise montant ne peut pas dépasser le sous-total', () => {
    const result = calculerTotauxAvecRemiseGlobale(lignes, 'montant', 9999)
    expect(result.remiseMontant).toBe(1500)
    expect(result.totalHT).toBe(0)
    expect(result.totalTVA).toBe(0)
    expect(result.totalTTC).toBe(0)
  })

  it('retourne zéros pour liste vide', () => {
    const result = calculerTotauxAvecRemiseGlobale([], 'pct', 10)
    expect(result.totalHT).toBe(0)
    expect(result.totalTVA).toBe(0)
    expect(result.totalTTC).toBe(0)
  })
})

// ─── formatClientName ─────────────────────────────────────────────────────────

describe('formatClientName', () => {
  it('retourne raison_sociale pour un professionnel', () => {
    expect(formatClientName({
      type: 'professionnel',
      raison_sociale: 'ACME SA',
      nom: 'Dupont',
      prenom: 'Jean',
    })).toBe('ACME SA')
  })

  it('retourne prénom + nom pour un particulier', () => {
    expect(formatClientName({
      type: 'particulier',
      nom: 'Dupont',
      prenom: 'Jean',
    })).toBe('Jean Dupont')
  })

  it('retourne seulement le nom si pas de prénom', () => {
    expect(formatClientName({
      type: 'particulier',
      nom: 'Dupont',
      prenom: null,
    })).toBe('Dupont')
  })

  it("retourne 'Client' si aucune donnée", () => {
    expect(formatClientName({
      type: 'particulier',
      nom: null,
      prenom: null,
    })).toBe('Client')
  })

  it("retourne prénom + nom si professionnel sans raison_sociale", () => {
    expect(formatClientName({
      type: 'professionnel',
      raison_sociale: null,
      nom: 'Martin',
      prenom: 'Alice',
    })).toBe('Alice Martin')
  })
})

// ─── isExonerationIntracom ────────────────────────────────────────────────────

describe('isExonerationIntracom', () => {
  it('retourne true pour un pro français avec TVA FR', () => {
    expect(isExonerationIntracom({
      type: 'professionnel',
      tva_numero: 'FR12345678901',
      pays: 'FR',
    })).toBe(true)
  })

  it("retourne false pour un particulier (même pays FR)", () => {
    expect(isExonerationIntracom({
      type: 'particulier',
      tva_numero: 'FR12345678901',
      pays: 'FR',
    })).toBe(false)
  })

  it('retourne false si TVA belge (BE)', () => {
    expect(isExonerationIntracom({
      type: 'professionnel',
      tva_numero: 'BE0472690764',
      pays: 'BE',
    })).toBe(false)
  })

  it('retourne false si TVA FR mais pays BE', () => {
    expect(isExonerationIntracom({
      type: 'professionnel',
      tva_numero: 'FR12345678901',
      pays: 'BE',
    })).toBe(false)
  })

  it('retourne false si pas de TVA', () => {
    expect(isExonerationIntracom({
      type: 'professionnel',
      tva_numero: null,
      pays: 'FR',
    })).toBe(false)
  })

  it('tolère espaces et points dans le numéro TVA', () => {
    expect(isExonerationIntracom({
      type: 'professionnel',
      tva_numero: 'FR 12 345 678 901',
      pays: 'FR',
    })).toBe(true)
  })
})
