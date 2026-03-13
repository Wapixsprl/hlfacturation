import { z } from 'zod/v4'

export const fournisseurSchema = z.object({
  raison_sociale: z.string().min(1, 'La raison sociale est requise'),
  contact_nom: z.string().optional().default(''),
  adresse: z.string().optional().default(''),
  code_postal: z.string().optional().default(''),
  ville: z.string().optional().default(''),
  pays: z.string().default('BE'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional().default(''),
  tva_numero: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export type FournisseurFormData = z.infer<typeof fournisseurSchema>
