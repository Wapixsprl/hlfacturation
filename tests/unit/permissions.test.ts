import { describe, it, expect } from 'vitest'
import { canRead, canWrite, PERMISSIONS, type Role, type Resource } from '@/lib/auth/permissions'

// ─── canRead ──────────────────────────────────────────────────────────────────

describe('canRead', () => {
  it('super_admin peut tout lire', () => {
    const resources: Resource[] = Object.keys(PERMISSIONS) as Resource[]
    for (const resource of resources) {
      expect(canRead('super_admin', resource)).toBe(true)
    }
  })

  it('ouvrier peut lire les chantiers', () => {
    expect(canRead('ouvrier', 'chantiers')).toBe(true)
  })

  it('ouvrier ne peut pas lire les factures', () => {
    expect(canRead('ouvrier', 'factures')).toBe(false)
  })

  it('comptable peut lire les factures et la trésorerie', () => {
    expect(canRead('comptable', 'factures')).toBe(true)
    expect(canRead('comptable', 'tresorerie')).toBe(true)
  })

  it('comptable ne peut pas lire les paramètres', () => {
    expect(canRead('comptable', 'parametres')).toBe(false)
  })

  it('utilisateur peut lire les clients et les devis', () => {
    expect(canRead('utilisateur', 'clients')).toBe(true)
    expect(canRead('utilisateur', 'devis')).toBe(true)
  })

  it('utilisateur ne peut pas lire les paramètres', () => {
    expect(canRead('utilisateur', 'parametres')).toBe(false)
  })

  it('resp_equipe peut lire le planning et les chantiers', () => {
    expect(canRead('resp_equipe', 'planning')).toBe(true)
    expect(canRead('resp_equipe', 'chantiers')).toBe(true)
  })

  it('equipe peut lire le planning', () => {
    expect(canRead('equipe', 'planning')).toBe(true)
  })

  it('equipe ne peut pas lire les factures', () => {
    expect(canRead('equipe', 'factures')).toBe(false)
  })
})

// ─── canWrite ─────────────────────────────────────────────────────────────────

describe('canWrite', () => {
  it('super_admin peut tout écrire', () => {
    const resources: Resource[] = Object.keys(PERMISSIONS) as Resource[]
    for (const resource of resources) {
      expect(canWrite('super_admin', resource)).toBe(true)
    }
  })

  it('utilisateur peut créer des devis et des clients', () => {
    expect(canWrite('utilisateur', 'devis')).toBe(true)
    expect(canWrite('utilisateur', 'clients')).toBe(true)
  })

  it('utilisateur ne peut pas modifier les paramètres', () => {
    expect(canWrite('utilisateur', 'parametres')).toBe(false)
  })

  it('utilisateur ne peut pas modifier les produits', () => {
    expect(canWrite('utilisateur', 'produits')).toBe(false)
  })

  it('comptable peut créer des factures et factures achat', () => {
    expect(canWrite('comptable', 'factures')).toBe(true)
    expect(canWrite('comptable', 'factures_achat')).toBe(true)
  })

  it('comptable ne peut pas créer de devis', () => {
    expect(canWrite('comptable', 'devis')).toBe(false)
  })

  it('ouvrier ne peut rien écrire (aucune resource)', () => {
    const resources: Resource[] = Object.keys(PERMISSIONS) as Resource[]
    for (const resource of resources) {
      expect(canWrite('ouvrier', resource)).toBe(false)
    }
  })

  it('resp_equipe peut modifier le planning et les chantiers', () => {
    expect(canWrite('resp_equipe', 'planning')).toBe(true)
    expect(canWrite('resp_equipe', 'chantiers')).toBe(true)
  })

  it('resp_equipe ne peut pas modifier les équipes', () => {
    expect(canWrite('resp_equipe', 'equipes')).toBe(false)
  })

  it('equipe ne peut rien écrire', () => {
    const resources: Resource[] = Object.keys(PERMISSIONS) as Resource[]
    for (const resource of resources) {
      expect(canWrite('equipe', resource)).toBe(false)
    }
  })
})

// ─── Cohérence matrice ────────────────────────────────────────────────────────

describe('cohérence de la matrice PERMISSIONS', () => {
  it('tout rôle qui peut écrire peut aussi lire', () => {
    for (const [resource, perms] of Object.entries(PERMISSIONS)) {
      for (const role of perms.write) {
        expect(perms.read).toContain(role)
      }
    }
  })
})
