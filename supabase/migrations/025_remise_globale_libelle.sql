-- Migration 025: Libellé optionnel pour la remise globale (devis et factures)

ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS remise_globale_libelle TEXT;

ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS remise_globale_libelle TEXT;
