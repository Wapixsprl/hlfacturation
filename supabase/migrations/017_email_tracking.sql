-- 017: Add email tracking columns and RPC functions for devis and factures

-- Add email tracking columns to devis
ALTER TABLE devis
  ADD COLUMN IF NOT EXISTS email_ouvertures INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_derniere_ouverture TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nb_relances INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS derniere_relance TIMESTAMPTZ;

-- Add email tracking columns to factures
ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS email_ouvertures INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS email_derniere_ouverture TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS nombre_envois INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_relances INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS derniere_relance TIMESTAMPTZ;

-- RPC function to increment devis email opens
CREATE OR REPLACE FUNCTION increment_email_ouvertures(p_devis_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE devis
  SET email_ouvertures = COALESCE(email_ouvertures, 0) + 1,
      email_derniere_ouverture = NOW()
  WHERE id = p_devis_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to increment facture email opens
CREATE OR REPLACE FUNCTION increment_facture_email_ouvertures(p_facture_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE factures
  SET email_ouvertures = COALESCE(email_ouvertures, 0) + 1,
      email_derniere_ouverture = NOW()
  WHERE id = p_facture_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
