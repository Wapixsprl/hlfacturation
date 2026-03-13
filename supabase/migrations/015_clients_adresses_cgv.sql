-- 015: Ajout adresses livraison/facturation sur clients + CGV sur entreprises
-- + champ conditions_generales_acceptees sur devis (signature)

-- Adresse de facturation (séparée de l'adresse principale)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS adresse_facturation TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS code_postal_facturation TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ville_facturation TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pays_facturation TEXT DEFAULT 'BE';

-- Adresse de livraison
ALTER TABLE clients ADD COLUMN IF NOT EXISTS adresse_livraison TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS code_postal_livraison TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ville_livraison TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pays_livraison TEXT DEFAULT 'BE';

-- Conditions générales de vente sur entreprise
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS conditions_generales_vente TEXT;

-- Acceptation CGV sur devis (stocke la date d'acceptation lors de la signature)
ALTER TABLE devis ADD COLUMN IF NOT EXISTS cgv_acceptees BOOLEAN DEFAULT false;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS cgv_acceptees_date TIMESTAMPTZ;

-- Échéancier avec dates programmées pour les acomptes
-- On ajoute un champ JSONB pour stocker les dates d'échéance des acomptes
-- Format: [{ pourcentage: 30, label: "Acompte 1", date_echeance: "2026-04-01" }]
-- Le champ existant acomptes_config est enrichi côté applicatif
