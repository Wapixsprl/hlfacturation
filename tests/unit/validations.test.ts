import { describe, it, expect } from 'vitest'
import { clientSchema } from '@/lib/validations/client'
import { produitSchema } from '@/lib/validations/produit'
import { entrepriseSchema, facturationSchema, alertesSchema } from '@/lib/validations/entreprise'
import { factureAchatSchema, echeanceSchema } from '@/lib/validations/facture-achat'
import { mouvementSchema } from '@/lib/validations/mouvement'

// ─── clientSchema ─────────────────────────────────────────────────────────────

describe('clientSchema', () => {
  const base = { type: 'particulier' as const, nom: 'Dupont' }

  it('valide un client particulier minimal', () => {
    const result = clientSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('valide un client professionnel avec raison sociale', () => {
    const result = clientSchema.safeParse({
      type: 'professionnel',
      nom: 'Dupont',
      raison_sociale: 'ACME SA',
    })
    expect(result.success).toBe(true)
  })

  it('rejette si le nom est vide', () => {
    const result = clientSchema.safeParse({ ...base, nom: '' })
    expect(result.success).toBe(false)
  })

  it('rejette un type inconnu', () => {
    const result = clientSchema.safeParse({ ...base, type: 'autre' })
    expect(result.success).toBe(false)
  })

  it('rejette un email invalide', () => {
    const result = clientSchema.safeParse({ ...base, email: 'pas-un-email' })
    expect(result.success).toBe(false)
  })

  it('accepte un email vide (champ optionnel)', () => {
    const result = clientSchema.safeParse({ ...base, email: '' })
    expect(result.success).toBe(true)
  })

  it('accepte un email valide', () => {
    const result = clientSchema.safeParse({ ...base, email: 'jean@example.be' })
    expect(result.success).toBe(true)
  })

  it('applique BE comme pays par défaut', () => {
    const result = clientSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pays).toBe('BE')
    }
  })
})

// ─── produitSchema ────────────────────────────────────────────────────────────

describe('produitSchema', () => {
  const base = {
    designation: 'Pose carrelage',
    categorie: 'main_oeuvre' as const,
    prix_ht: 45,
    taux_tva: 21,
  }

  it('valide un produit complet', () => {
    const result = produitSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('rejette si la désignation est vide', () => {
    const result = produitSchema.safeParse({ ...base, designation: '' })
    expect(result.success).toBe(false)
  })

  it('rejette une catégorie inconnue', () => {
    const result = produitSchema.safeParse({ ...base, categorie: 'inconnu' })
    expect(result.success).toBe(false)
  })

  it('rejette un prix HT négatif', () => {
    const result = produitSchema.safeParse({ ...base, prix_ht: -10 })
    expect(result.success).toBe(false)
  })

  it('accepte un prix HT à zéro', () => {
    const result = produitSchema.safeParse({ ...base, prix_ht: 0 })
    expect(result.success).toBe(true)
  })

  it('coerce le prix HT depuis une string', () => {
    const result = produitSchema.safeParse({ ...base, prix_ht: '99.5' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.prix_ht).toBe(99.5)
    }
  })

  it('applique "piece" comme unité par défaut', () => {
    const result = produitSchema.safeParse(base)
    if (result.success) {
      expect(result.data.unite).toBe('piece')
    }
  })

  it('accepte toutes les unités valides', () => {
    const unites = ['h', 'j', 'forfait', 'm2', 'm3', 'ml', 'piece', 'lot', 'kg', 'l', 'autre'] as const
    for (const unite of unites) {
      const result = produitSchema.safeParse({ ...base, unite })
      expect(result.success).toBe(true)
    }
  })
})

// ─── entrepriseSchema ─────────────────────────────────────────────────────────

describe('entrepriseSchema', () => {
  it('valide avec juste un nom', () => {
    const result = entrepriseSchema.safeParse({ nom: 'HL Rénovation' })
    expect(result.success).toBe(true)
  })

  it('rejette si le nom est vide', () => {
    const result = entrepriseSchema.safeParse({ nom: '' })
    expect(result.success).toBe(false)
  })

  it('rejette un email invalide', () => {
    const result = entrepriseSchema.safeParse({ nom: 'HL', email: 'invalide' })
    expect(result.success).toBe(false)
  })

  it('accepte un email vide', () => {
    const result = entrepriseSchema.safeParse({ nom: 'HL', email: '' })
    expect(result.success).toBe(true)
  })
})

describe('facturationSchema', () => {
  it('valide avec les valeurs par défaut', () => {
    const result = facturationSchema.safeParse({ delai_validite_devis_jours: 30 })
    expect(result.success).toBe(true)
  })

  it('rejette un délai à zéro', () => {
    const result = facturationSchema.safeParse({ delai_validite_devis_jours: 0 })
    expect(result.success).toBe(false)
  })

  it('rejette un délai supérieur à 365', () => {
    const result = facturationSchema.safeParse({ delai_validite_devis_jours: 366 })
    expect(result.success).toBe(false)
  })

  it('accepte exactement 1 et 365 (bornes)', () => {
    expect(facturationSchema.safeParse({ delai_validite_devis_jours: 1 }).success).toBe(true)
    expect(facturationSchema.safeParse({ delai_validite_devis_jours: 365 }).success).toBe(true)
  })
})

describe('alertesSchema', () => {
  it('valide un seuil positif', () => {
    expect(alertesSchema.safeParse({ seuil_alerte_tresorerie: 5000 }).success).toBe(true)
  })

  it('accepte zéro (désactivation)', () => {
    expect(alertesSchema.safeParse({ seuil_alerte_tresorerie: 0 }).success).toBe(true)
  })

  it('rejette un seuil négatif', () => {
    expect(alertesSchema.safeParse({ seuil_alerte_tresorerie: -1 }).success).toBe(false)
  })
})

// ─── factureAchatSchema ───────────────────────────────────────────────────────

describe('factureAchatSchema', () => {
  const base = {
    fournisseur_id: 'uuid-fournisseur',
    date_facture: '2026-01-15',
    categorie: 'materiaux' as const,
    taux_tva: 21,
    total_ht: 1000,
    total_tva: 210,
    total_ttc: 1210,
  }

  it('valide une facture achat minimale', () => {
    const result = factureAchatSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('rejette si fournisseur_id est vide', () => {
    const result = factureAchatSchema.safeParse({ ...base, fournisseur_id: '' })
    expect(result.success).toBe(false)
  })

  it('rejette si date_facture est vide', () => {
    const result = factureAchatSchema.safeParse({ ...base, date_facture: '' })
    expect(result.success).toBe(false)
  })

  it('rejette une catégorie inconnue', () => {
    const result = factureAchatSchema.safeParse({ ...base, categorie: 'inconnu' })
    expect(result.success).toBe(false)
  })

  it('rejette un total_ttc négatif', () => {
    const result = factureAchatSchema.safeParse({ ...base, total_ttc: -5 })
    expect(result.success).toBe(false)
  })

  it('valide avec des échéances', () => {
    const result = factureAchatSchema.safeParse({
      ...base,
      echeances: [
        { date_echeance: '2026-02-15', montant: 605, statut: 'a_payer' },
        { date_echeance: '2026-03-15', montant: 605, statut: 'a_payer' },
      ],
    })
    expect(result.success).toBe(true)
  })
})

describe('echeanceSchema', () => {
  const base = { date_echeance: '2026-02-01', montant: 500 }

  it('valide une échéance minimale', () => {
    expect(echeanceSchema.safeParse(base).success).toBe(true)
  })

  it('rejette un montant à zéro', () => {
    expect(echeanceSchema.safeParse({ ...base, montant: 0 }).success).toBe(false)
  })

  it('rejette un montant négatif', () => {
    expect(echeanceSchema.safeParse({ ...base, montant: -1 }).success).toBe(false)
  })

  it('rejette si la date est vide', () => {
    expect(echeanceSchema.safeParse({ ...base, date_echeance: '' }).success).toBe(false)
  })

  it("applique 'a_payer' comme statut par défaut", () => {
    const result = echeanceSchema.safeParse(base)
    if (result.success) {
      expect(result.data.statut).toBe('a_payer')
    }
  })
})

// ─── mouvementSchema ──────────────────────────────────────────────────────────

describe('mouvementSchema', () => {
  const base = {
    date_mouvement: '2026-01-10',
    libelle: 'Virement client Dupont',
    montant: 1210,
    type: 'encaissement_client' as const,
  }

  it('valide un mouvement complet', () => {
    expect(mouvementSchema.safeParse(base).success).toBe(true)
  })

  it('rejette si la date est vide', () => {
    expect(mouvementSchema.safeParse({ ...base, date_mouvement: '' }).success).toBe(false)
  })

  it('rejette si le libellé est vide', () => {
    expect(mouvementSchema.safeParse({ ...base, libelle: '' }).success).toBe(false)
  })

  it('rejette un montant nul ou négatif', () => {
    expect(mouvementSchema.safeParse({ ...base, montant: 0 }).success).toBe(false)
    expect(mouvementSchema.safeParse({ ...base, montant: -100 }).success).toBe(false)
  })

  it('rejette un type inconnu', () => {
    expect(mouvementSchema.safeParse({ ...base, type: 'inconnu' }).success).toBe(false)
  })

  it('accepte tous les types valides', () => {
    const types = ['encaissement_client', 'paiement_fournisseur', 'autre_entree', 'autre_sortie'] as const
    for (const type of types) {
      expect(mouvementSchema.safeParse({ ...base, type }).success).toBe(true)
    }
  })

  it('coerce le montant depuis une string', () => {
    const result = mouvementSchema.safeParse({ ...base, montant: '1210.50' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.montant).toBe(1210.5)
    }
  })
})
