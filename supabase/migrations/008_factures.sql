-- Table factures
CREATE TABLE IF NOT EXISTS factures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  devis_id UUID REFERENCES devis,
  numero TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('facture','acompte','avoir','situation')) DEFAULT 'facture',
  statut TEXT CHECK (statut IN ('brouillon','envoyee','partiellement_payee','payee','en_retard')) DEFAULT 'brouillon',
  date_facture DATE DEFAULT CURRENT_DATE,
  date_echeance DATE,
  mention_tva TEXT,
  conditions_paiement TEXT,
  total_ht DECIMAL(12,2) DEFAULT 0,
  total_tva DECIMAL(12,2) DEFAULT 0,
  total_ttc DECIMAL(12,2) DEFAULT 0,
  montant_acomptes_deduits DECIMAL(12,2) DEFAULT 0,
  solde_ttc DECIMAL(12,2) DEFAULT 0,
  pdf_url TEXT,
  notes_internes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factures_entreprise_isolation" ON factures FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

-- Table lignes de factures
CREATE TABLE IF NOT EXISTS factures_lignes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id UUID REFERENCES factures ON DELETE CASCADE NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  type TEXT CHECK (type IN ('produit','texte','section')) DEFAULT 'produit',
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

ALTER TABLE factures_lignes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factures_lignes_via_facture" ON factures_lignes FOR ALL
  USING (facture_id IN (SELECT id FROM factures WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));
