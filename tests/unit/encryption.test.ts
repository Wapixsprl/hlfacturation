import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encryptApiKey, decryptApiKey } from '@/lib/payments/encryption'

// Clé de test 32 bytes (64 hex) — jamais utiliser en production
const TEST_KEY = 'a'.repeat(64)

function withKey(fn: () => void) {
  const original = process.env.PAYMENT_ENCRYPTION_KEY
  process.env.PAYMENT_ENCRYPTION_KEY = TEST_KEY
  try {
    fn()
  } finally {
    process.env.PAYMENT_ENCRYPTION_KEY = original
  }
}

describe('encryptApiKey / decryptApiKey', () => {
  it('chiffre puis déchiffre correctement', () => {
    withKey(() => {
      const plain = 'sk_test_abc123xyz'
      const cipher = encryptApiKey(plain)
      expect(decryptApiKey(cipher)).toBe(plain)
    })
  })

  it('produit un ciphertext différent à chaque appel (IV aléatoire)', () => {
    withKey(() => {
      const plain = 'ma_cle_api'
      const c1 = encryptApiKey(plain)
      const c2 = encryptApiKey(plain)
      expect(c1).not.toBe(c2)
    })
  })

  it('le format stocké est iv:tag:ciphertext (3 parties hex)', () => {
    withKey(() => {
      const cipher = encryptApiKey('test')
      const parts = cipher.split(':')
      expect(parts).toHaveLength(3)
      // IV = 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32)
      // Tag GCM = 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32)
      // Ciphertext doit être non vide
      expect(parts[2].length).toBeGreaterThan(0)
    })
  })

  it('lève une erreur si PAYMENT_ENCRYPTION_KEY est absente', () => {
    const original = process.env.PAYMENT_ENCRYPTION_KEY
    delete process.env.PAYMENT_ENCRYPTION_KEY
    expect(() => encryptApiKey('test')).toThrow('PAYMENT_ENCRYPTION_KEY non definie')
    process.env.PAYMENT_ENCRYPTION_KEY = original
  })

  it('lève une erreur si la clé ne fait pas 32 bytes (64 hex)', () => {
    const original = process.env.PAYMENT_ENCRYPTION_KEY
    process.env.PAYMENT_ENCRYPTION_KEY = 'aabbcc' // trop court
    expect(() => encryptApiKey('test')).toThrow('32 bytes')
    process.env.PAYMENT_ENCRYPTION_KEY = original
  })

  it('lève une erreur si le format ciphertext est invalide', () => {
    withKey(() => {
      expect(() => decryptApiKey('format_invalide')).toThrow('Format de cle chiffree invalide')
    })
  })

  it('lève une erreur si le ciphertext est altéré (tag GCM invalide)', () => {
    withKey(() => {
      const cipher = encryptApiKey('donnee_secrete')
      const parts = cipher.split(':')
      // Altérer le ciphertext
      const tampered = parts[0] + ':' + parts[1] + ':' + 'ff'.repeat(parts[2].length / 2)
      expect(() => decryptApiKey(tampered)).toThrow()
    })
  })

  it('chiffre une chaîne vide sans erreur', () => {
    withKey(() => {
      const cipher = encryptApiKey('')
      expect(decryptApiKey(cipher)).toBe('')
    })
  })

  it('chiffre une longue clé API', () => {
    withKey(() => {
      const longKey = 'sk_live_' + 'x'.repeat(200)
      expect(decryptApiKey(encryptApiKey(longKey))).toBe(longKey)
    })
  })
})
