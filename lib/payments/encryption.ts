import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.PAYMENT_ENCRYPTION_KEY
  if (!key) {
    throw new Error('PAYMENT_ENCRYPTION_KEY non definie. Generez une cle de 32 bytes hex.')
  }
  const buf = Buffer.from(key, 'hex')
  if (buf.length !== 32) {
    throw new Error('PAYMENT_ENCRYPTION_KEY doit faire 32 bytes (64 caracteres hex).')
  }
  return buf
}

/**
 * Chiffre une cle API en AES-256-GCM.
 * Format stocke : iv:tag:ciphertext (tout en hex)
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
}

function hmacSig(data: string): string {
  const key = process.env.PAYMENT_ENCRYPTION_KEY
  if (!key) throw new Error('PAYMENT_ENCRYPTION_KEY non definie')
  return createHmac('sha256', Buffer.from(key, 'hex'))
    .update(data)
    .digest('hex')
    .slice(0, 32)
}

/** Signature HMAC pour les webhooks Mollie (URL ?sig=). */
export function mollieWebhookSig(entrepriseId: string): string {
  return hmacSig(`mollie:${entrepriseId}`)
}

/** Signature HMAC pour les liens "Voir la facture" dans les emails. */
export function factureViewSig(factureId: string): string {
  return hmacSig(`view:${factureId}`)
}

/**
 * Dechiffre une cle API stockee au format iv:tag:ciphertext
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('Format de cle chiffree invalide')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
