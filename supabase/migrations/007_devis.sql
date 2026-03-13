-- Table devis
CREATE TABLE IF NOT EXISTS devis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  numero TEXT UNIQUE NOT NULL,
  statut TEXT CHECK (statut IN ('brouillon','envoye','accepte','refuse','expire','converti')) DEFAULT 'brouillon',
  titre TEXT,
  reference_chantier TEXT,
  date_devis DATE DEFAULT CURRENT_DATE,
  date_validite DATE,
  conditions_paiement TEXT,
  acomptes_config JSONB DEFAULT '[]',
  introduction TEXT,
  conclusion TEXT,
  notes_internes TEXT,
  total_ht DECIMAL(12,2) DEFAULT 0,
  total_tva DECIMAL(12,2) DEFAULT 0,
  total_ttc DECIMAL(12,2) DEFAULT 0,
  token_signature TEXT UNIQUE,
  token_expiration TIMESTAMPTZ,
  signature_image TEXT,
  signature_ip TEXT,
  signature_date TIMESTAMPTZ,
  signature_user_agent TEXT,
  pdf_url TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devis_entreprise_isolation" ON devis FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

-- Table lignes de devis
CREATE TABLE IF NOT EXISTS devis_lignes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id UUID REFERENCES devis ON DELETE CASCADE NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  type TEXT CHECK (type IN ('produit','texte','section','saut_page')) DEFAULT 'produit',
  produit_id UUID REFERENCES produits,
  designation TEXT,
  description TEXT,
  quantite DECIMAL(10,3) DEFAULT 1,
  unite TEXT,
  prix_unitaire_ht DECIMAL(12,2) DEFAULT 0,
  remise_pct DECIMAL(5,2) DEFAULT 0,
  taux_tva DECIMAL(5,2) DEFAULT 21.00,
  total_ht DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devis_lignes_via_devis" ON devis_lignes FOR ALL
  USING (devis_id IN (SELECT id FROM devis WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));
