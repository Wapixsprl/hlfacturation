import { z } from 'zod/v4'

export const clientSchema = z.object({
  type: z.enum(['particulier', 'professionnel']),
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().optional().default(''),
  raison_sociale: z.string().optional().default(''),
  adresse: z.string().optional().default(''),
  code_postal: z.string().optional().default(''),
  ville: z.string().optional().default(''),
  pays: z.string().default('BE'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional().default(''),
  telephone2: z.string().optional().default(''),
  tva_numero: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  // Adresse de facturation
  adresse_facturation: z.string().optional().default(''),
  code_postal_facturation: z.string().optional().default(''),
  ville_facturation: z.string().optional().default(''),
  pays_facturation: z.string().optional().default('BE'),
  // Adresse de livraison
  adresse_livraison: z.string().optional().default(''),
  code_postal_livraison: z.string().optional().default(''),
  ville_livraison: z.string().optional().default(''),
  pays_livraison: z.string().optional().default('BE'),
})

export type ClientFormData = z.infer<typeof clientSchema>
