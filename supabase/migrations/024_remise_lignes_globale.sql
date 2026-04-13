-- Migration 024: Remise par ligne (% ou montant fixe) + remise globale sur devis/factures

-- Lignes devis : remise en montant fixe + type
ALTER TABLE devis_lignes
  ADD COLUMN IF NOT EXISTS remise_type TEXT DEFAULT 'pct' CHECK (remise_type IN ('pct', 'montant')),
  ADD COLUMN IF NOT EXISTS remise_montant DECIMAL(12,2) DEFAULT 0;

-- Lignes factures : remise en montant fixe + type
ALTER TABLE factures_lignes
  ADD COLUMN IF NOT EXISTS remise_type TEXT DEFAULT 'pct' CHECK (remise_type IN ('pct', 'montant')),
  ADD COLUMN IF NOT EXISTS remise_montant DECIMAL(12,2) DEFAULT 0;

-- Devis : remise globale (sur le total HT des lignes)
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS remise_globale_type TEXT DEFAULT 'pct' CHECK (remise_globale_type IN ('pct', 'montant')),
  ADD COLUMN IF NOT EXISTS remise_globale_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_globale_montant DECIMAL(12,2) DEFAULT 0;

-- Factures : remise globale
ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS remise_globale_type TEXT DEFAULT 'pct' CHECK (remise_globale_type IN ('pct', 'montant')),
  ADD COLUMN IF NOT EXISTS remise_globale_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_globale_montant DECIMAL(12,2) DEFAULT 0;
