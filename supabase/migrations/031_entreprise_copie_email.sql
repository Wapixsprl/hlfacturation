-- 031: Adresse email de copie pour les envois de devis et factures
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS copie_email TEXT DEFAULT NULL;
