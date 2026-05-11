-- Pourcentage d'acompte sur les factures de type 'acompte'
ALTER TABLE factures ADD COLUMN IF NOT EXISTS acompte_pct DECIMAL(5,2) DEFAULT NULL;
