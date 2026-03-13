import { z } from 'zod/v4'

export const echeanceSchema = z.object({
  id: z.string().optional(),
  date_echeance: z.string().min(1, "La date d'échéance est requise"),
  montant: z.coerce.number().min(0.01, 'Le montant doit être supérieur à 0'),
  statut: z.enum(['a_payer', 'paye', 'en_retard']).default('a_payer'),
  date_paiement: z.string().nullable().optional(),
  mode_paiement: z.enum(['virement', 'cheque', 'cash', 'autre']).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const factureAchatSchema = z.object({
  fournisseur_id: z.string().min(1, 'Le fournisseur est requis'),
  numero_fournisseur: z.string().optional().default(''),
  date_facture: z.string().min(1, 'La date de facture est requise'),
  designation: z.string().optional().default(''),
  categorie: z.enum([
    'materiaux',
    'sous_traitance',
    'carburant',
    'assurance',
    'outillage',
    'telecom',
    'autre',
  ]),
  devis_id: z.string().optional().default(''),
  taux_tva: z.coerce.number().min(0, 'Le taux TVA doit être positif').default(21),
  total_ht: z.coerce.number().min(0, 'Le montant HT doit être positif'),
  total_tva: z.coerce.number().min(0, 'Le montant TVA doit être positif'),
  total_ttc: z.coerce.number().min(0, 'Le montant TTC doit être positif'),
  fichier_url: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  echeances: z.array(echeanceSchema).default([]),
})

export type FactureAchatFormData = z.infer<typeof factureAchatSchema>
export type EcheanceFormData = z.infer<typeof echeanceSchema>
