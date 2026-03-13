-- Table factures d'achat (fournisseurs)
CREATE TABLE IF NOT EXISTS factures_achat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  fournisseur_id UUID REFERENCES fournisseurs NOT NULL,
  devis_id UUID REFERENCES devis,
  numero_fournisseur TEXT,
  statut TEXT CHECK (statut IN ('a_payer','partiellement_paye','paye','en_retard')) DEFAULT 'a_payer',
  date_facture DATE NOT NULL,
  designation TEXT,
  categorie TEXT CHECK (categorie IN ('materiaux','sous_traitance','carburant','assurance','outillage','telecom','autre')) DEFAULT 'autre',
  total_ht DECIMAL(12,2) DEFAULT 0,
  total_tva DECIMAL(12,2) DEFAULT 0,
  total_ttc DECIMAL(12,2) NOT NULL,
  fichier_url TEXT,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE factures_achat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factures_achat_entreprise_isolation" ON factures_achat FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

-- Table échéances fournisseurs
CREATE TABLE IF NOT EXISTS echeances_fournisseurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_achat_id UUID REFERENCES factures_achat ON DELETE CASCADE NOT NULL,
  date_echeance DATE NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  statut TEXT CHECK (statut IN ('a_payer','paye','en_retard')) DEFAULT 'a_payer',
  date_paiement DATE,
  mode_paiement TEXT CHECK (mode_paiement IN ('virement','cheque','cash','autre')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE echeances_fournisseurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "echeances_via_facture_achat" ON echeances_fournisseurs FOR ALL
  USING (facture_achat_id IN (SELECT id FROM factures_achat WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));
