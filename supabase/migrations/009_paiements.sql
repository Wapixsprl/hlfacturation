-- Table paiements clients
CREATE TABLE IF NOT EXISTS paiements_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  facture_id UUID REFERENCES factures NOT NULL,
  date_paiement DATE NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  mode TEXT CHECK (mode IN ('virement','cheque','cash','carte','autre')) DEFAULT 'virement',
  reference_bancaire TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paiements_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paiements_entreprise_isolation" ON paiements_clients FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
