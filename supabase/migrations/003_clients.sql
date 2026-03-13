-- Table clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  type TEXT CHECK (type IN ('particulier','professionnel')) DEFAULT 'particulier',
  nom TEXT,
  prenom TEXT,
  raison_sociale TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'BE',
  email TEXT,
  telephone TEXT,
  telephone2 TEXT,
  tva_numero TEXT,
  tva_valide BOOLEAN,
  iban TEXT,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_entreprise_isolation" ON clients FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
