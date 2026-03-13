-- Add custom numbering prefixes to entreprises
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS prefixe_devis TEXT DEFAULT 'DEV',
  ADD COLUMN IF NOT EXISTS prefixe_facture TEXT DEFAULT 'FAC',
  ADD COLUMN IF NOT EXISTS prefixe_avoir TEXT DEFAULT 'AVO';
