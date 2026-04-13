-- Migration 026: Remise sur factures d'achat

ALTER TABLE factures_achat
  ADD COLUMN IF NOT EXISTS remise_type TEXT DEFAULT 'pct' CHECK (remise_type IN ('pct', 'montant')),
  ADD COLUMN IF NOT EXISTS remise_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_montant DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_libelle TEXT;
