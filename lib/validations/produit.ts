import { z } from 'zod/v4'

export const produitSchema = z.object({
  reference: z.string().optional().default(''),
  designation: z.string().min(1, 'La désignation est requise'),
  description: z.string().optional().default(''),
  categorie: z.enum(['materiaux', 'main_oeuvre', 'sous_traitance', 'equipement', 'forfait', 'autre']),
  prix_ht: z.coerce.number().min(0, 'Le prix doit être positif'),
  prix_achat_ht: z.coerce.number().min(0).optional(),
  taux_tva: z.coerce.number().default(21),
  unite: z.enum(['h', 'j', 'forfait', 'm2', 'm3', 'ml', 'piece', 'lot', 'kg', 'l', 'autre']).default('piece'),
})

export type ProduitFormData = z.infer<typeof produitSchema>
