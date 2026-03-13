-- Table fournisseurs
CREATE TABLE IF NOT EXISTS fournisseurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  raison_sociale TEXT NOT NULL,
  contact_nom TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'BE',
  email TEXT,
  telephone TEXT,
  tva_numero TEXT,
  iban TEXT,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fournisseurs_entreprise_isolation" ON fournisseurs FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
