-- Fix ALL RLS policies to use auth_user_entreprise_id() instead of direct subquery on utilisateurs
-- This prevents infinite recursion since utilisateurs has RLS enabled

-- 1. chantiers
DROP POLICY IF EXISTS "entreprise_isolation" ON chantiers;
CREATE POLICY "entreprise_isolation" ON chantiers FOR ALL
  USING (entreprise_id = auth_user_entreprise_id());

-- 2. equipes
DROP POLICY IF EXISTS "entreprise_isolation" ON equipes;
CREATE POLICY "entreprise_isolation" ON equipes FOR ALL
  USING (entreprise_id = auth_user_entreprise_id());

-- 3. journal_chantier
DROP POLICY IF EXISTS "entreprise_isolation" ON journal_chantier;
CREATE POLICY "entreprise_isolation" ON journal_chantier FOR ALL
  USING (chantier_id IN (
    SELECT id FROM chantiers WHERE entreprise_id = auth_user_entreprise_id()
  ));

-- 4. membres_equipe
DROP POLICY IF EXISTS "entreprise_isolation" ON membres_equipe;
CREATE POLICY "entreprise_isolation" ON membres_equipe FOR ALL
  USING (equipe_id IN (
    SELECT id FROM equipes WHERE entreprise_id = auth_user_entreprise_id()
  ));

-- 5. taches_chantier
DROP POLICY IF EXISTS "entreprise_isolation" ON taches_chantier;
CREATE POLICY "entreprise_isolation" ON taches_chantier FOR ALL
  USING (chantier_id IN (
    SELECT id FROM chantiers WHERE entreprise_id = auth_user_entreprise_id()
  ));

-- 6. pv_reception
DROP POLICY IF EXISTS "entreprise_isolation" ON pv_reception;
CREATE POLICY "entreprise_isolation" ON pv_reception FOR ALL
  USING (chantier_id IN (
    SELECT id FROM chantiers WHERE entreprise_id = auth_user_entreprise_id()
  ));

-- 7. sous_traitants_chantier
DROP POLICY IF EXISTS "entreprise_isolation" ON sous_traitants_chantier;
CREATE POLICY "entreprise_isolation" ON sous_traitants_chantier FOR ALL
  USING (chantier_id IN (
    SELECT id FROM chantiers WHERE entreprise_id = auth_user_entreprise_id()
  ));

-- 8. objectifs_ca
DROP POLICY IF EXISTS "entreprise_isolation" ON objectifs_ca;
CREATE POLICY "entreprise_isolation" ON objectifs_ca FOR ALL
  USING (entreprise_id = auth_user_entreprise_id());

-- 9. payment_sessions
DROP POLICY IF EXISTS "ps_entreprise_isolation" ON payment_sessions;
CREATE POLICY "ps_entreprise_isolation" ON payment_sessions FOR ALL
  USING (entreprise_id = auth_user_entreprise_id());

-- 10. storage objects (uploads bucket)
DROP POLICY IF EXISTS "users_read_own_files" ON storage.objects;
CREATE POLICY "users_read_own_files" ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth_user_entreprise_id()::text);

DROP POLICY IF EXISTS "users_upload_own_files" ON storage.objects;
CREATE POLICY "users_upload_own_files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth_user_entreprise_id()::text);

DROP POLICY IF EXISTS "users_delete_own_files" ON storage.objects;
CREATE POLICY "users_delete_own_files" ON storage.objects FOR DELETE
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth_user_entreprise_id()::text);
