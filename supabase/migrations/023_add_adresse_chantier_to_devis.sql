-- Add adresse_chantier field to devis table
ALTER TABLE devis ADD COLUMN IF NOT EXISTS adresse_chantier TEXT;
