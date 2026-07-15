-- Colonnes multi-tenant manquantes sur l'instance HL Rénovation
-- Ces colonnes sont requises par le code partagé avec WAPIXBTP
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'exempt',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Initialiser les valeurs pour les lignes existantes
UPDATE entreprises
SET
  subscription_status = 'exempt',
  email_verified = true
WHERE subscription_status IS NULL OR email_verified IS NULL;
