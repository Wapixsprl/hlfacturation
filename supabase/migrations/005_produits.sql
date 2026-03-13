-- Table produits
CREATE TABLE IF NOT EXISTS produits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  reference TEXT,
  designation TEXT NOT NULL,
  description TEXT,
  categorie TEXT CHECK (categorie IN ('materiaux','main_oeuvre','sous_traitance','equipement','forfait','autre')),
  prix_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  prix_achat_ht DECIMAL(12,2),
  taux_tva DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  unite TEXT CHECK (unite IN ('h','j','forfait','m2','m3','ml','piece','lot','kg','l','autre')) DEFAULT 'piece',
  actif BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE produits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produits_entreprise_isolation" ON produits FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
