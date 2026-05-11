-- Migration 030: Lignes en option sur les devis
ALTER TABLE devis_lignes ADD COLUMN IF NOT EXISTS is_option BOOLEAN DEFAULT false NOT NULL;
