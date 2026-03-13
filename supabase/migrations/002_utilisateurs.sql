-- Table utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
  id UUID REFERENCES auth.users PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  nom TEXT,
  prenom TEXT,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('super_admin','utilisateur','comptable')) DEFAULT 'utilisateur',
  actif BOOLEAN DEFAULT true,
  derniere_connexion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utilisateurs_select" ON utilisateurs FOR SELECT
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

CREATE POLICY "utilisateurs_update_own" ON utilisateurs FOR UPDATE
  USING (id = auth.uid());
