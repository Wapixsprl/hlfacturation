-- Table mouvements de trésorerie
CREATE TABLE IF NOT EXISTS mouvements_tresorerie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  date_mouvement DATE NOT NULL,
  libelle TEXT NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('encaissement_client','paiement_fournisseur','autre_entree','autre_sortie')),
  facture_id UUID REFERENCES factures,
  facture_achat_id UUID REFERENCES factures_achat,
  rapproche BOOLEAN DEFAULT false,
  reference_bancaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mouvements_tresorerie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tresorerie_entreprise_isolation" ON mouvements_tresorerie FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
