import { z } from 'zod/v4'

export const entrepriseSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  adresse: z.string().optional().default(''),
  code_postal: z.string().optional().default(''),
  ville: z.string().optional().default(''),
  pays: z.string().default('BE'),
  tva_numero: z.string().optional().default(''),
  iban: z.string().optional().default(''),
  telephone: z.string().optional().default(''),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  logo_url: z.string().optional().default(''),
})

export type EntrepriseFormData = z.infer<typeof entrepriseSchema>

export const facturationSchema = z.object({
  conditions_paiement_defaut: z.string().optional().default('Comptant'),
  delai_validite_devis_jours: z.coerce.number().int().min(1, 'Minimum 1 jour').max(365, 'Maximum 365 jours'),
  mention_tva_defaut: z.string().optional().default(''),
})

export type FacturationFormData = z.infer<typeof facturationSchema>

export const alertesSchema = z.object({
  seuil_alerte_tresorerie: z.coerce.number().min(0, 'Le seuil doit être positif'),
})

export type AlertesFormData = z.infer<typeof alertesSchema>
