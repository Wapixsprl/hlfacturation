-- Table entreprises
CREATE TABLE IF NOT EXISTS entreprises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'BE',
  tva_numero TEXT,
  iban TEXT,
  telephone TEXT,
  email TEXT,
  logo_url TEXT,
  conditions_paiement_defaut TEXT DEFAULT 'Comptant',
  delai_validite_devis_jours INTEGER DEFAULT 30,
  mention_tva_defaut TEXT,
  seuil_alerte_tresorerie DECIMAL(12,2) DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
