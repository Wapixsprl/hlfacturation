-- Numéro de séquence des acomptes par devis (Acompte 1, 2, 3…)
ALTER TABLE factures ADD COLUMN IF NOT EXISTS acompte_numero INTEGER;
