-- 016_relances_config.sql
-- Configurable reminder system for devis, factures vente, factures achat

-- Add relances configuration on entreprises (JSONB for flexibility)
ALTER TABLE entreprises
  ADD COLUMN IF NOT EXISTS relances_config JSONB DEFAULT '{
    "devis": {
      "enabled": true,
      "etapes": [
        {"jours": 7, "enabled": true},
        {"jours": 3, "enabled": true},
        {"jours": 0, "enabled": true}
      ],
      "espacement_minimum_jours": 7
    },
    "factures_vente": {
      "enabled": true,
      "etapes": [
        {"jours": 7, "enabled": true},
        {"jours": 15, "enabled": true},
        {"jours": 30, "enabled": true}
      ],
      "espacement_minimum_jours": 7
    },
    "factures_achat": {
      "enabled": false,
      "etapes": [
        {"jours": 7, "enabled": true},
        {"jours": 15, "enabled": true}
      ],
      "espacement_minimum_jours": 7,
      "destinataire": "fournisseur"
    }
  }'::jsonb;

-- Add relance tracking fields on factures_achat (devis and factures already have them)
ALTER TABLE factures_achat
  ADD COLUMN IF NOT EXISTS nb_relances INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS derniere_relance TIMESTAMPTZ;

-- Add email field on fournisseurs if not exists (already exists in schema)
-- Just add an index for relance queries
CREATE INDEX IF NOT EXISTS idx_factures_achat_relance
  ON factures_achat (statut, archived_at, nb_relances)
  WHERE statut IN ('a_payer', 'en_retard') AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_factures_relance
  ON factures (statut, archived_at, nb_relances)
  WHERE statut IN ('envoyee', 'partiellement_payee', 'en_retard') AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_devis_relance
  ON devis (statut, archived_at, nb_relances)
  WHERE statut = 'envoye' AND archived_at IS NULL;
