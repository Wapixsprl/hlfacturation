-- 028: Table de logs de connexion + index pour derniere_connexion

CREATE TABLE connexion_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id UUID REFERENCES utilisateurs(id) ON DELETE CASCADE NOT NULL,
  entreprise_id UUID REFERENCES entreprises(id) NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX idx_connexion_logs_user ON connexion_logs(utilisateur_id, connected_at DESC);
CREATE INDEX idx_connexion_logs_entreprise ON connexion_logs(entreprise_id, connected_at DESC);

ALTER TABLE connexion_logs ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut inserer son propre log
CREATE POLICY "insert_own" ON connexion_logs FOR INSERT
  WITH CHECK (utilisateur_id = auth.uid());

-- Lecture isolee par entreprise (super_admin voit tous les logs de son entreprise)
CREATE POLICY "entreprise_isolation" ON connexion_logs FOR SELECT
  USING (entreprise_id = auth_user_entreprise_id());
