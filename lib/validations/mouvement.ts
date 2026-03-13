import { z } from 'zod/v4'

export const mouvementSchema = z.object({
  date_mouvement: z.string().min(1, 'La date est requise'),
  libelle: z.string().min(1, 'Le libellé est requis'),
  montant: z.coerce.number().positive('Le montant doit être positif'),
  type: z.enum(['encaissement_client', 'paiement_fournisseur', 'autre_entree', 'autre_sortie']),
  reference_bancaire: z.string().optional().default(''),
  rapproche: z.boolean().optional().default(false),
})

export type MouvementFormData = z.infer<typeof mouvementSchema>
