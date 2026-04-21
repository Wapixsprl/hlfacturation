-- Migration 027: Corriger RLS manquant sur sequences_numerotation et entreprises

-- 1. sequences_numerotation : aucun RLS — risque légal (numérotation comptable)
ALTER TABLE sequences_numerotation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seq_entreprise_isolation" ON sequences_numerotation FOR ALL
  USING (entreprise_id = auth_user_entreprise_id())
  WITH CHECK (entreprise_id = auth_user_entreprise_id());

-- 2. entreprises : RLS activé mais aucune policy — accès bloqué silencieusement
CREATE POLICY "entreprises_own" ON entreprises FOR ALL
  USING (id = auth_user_entreprise_id())
  WITH CHECK (id = auth_user_entreprise_id());
