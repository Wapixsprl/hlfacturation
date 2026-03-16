-- Fix RLS policies on utilisateurs table
-- Previous: utilisateurs_read_own only allowed reading own row
-- Now: enterprise-wide read, super_admin can manage all users

-- Drop old restrictive policies
DROP POLICY IF EXISTS "utilisateurs_read_own" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_update_own" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_select" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_insert" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_update" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_delete" ON utilisateurs;

-- SELECT: all users in same enterprise can see each other
CREATE POLICY "utilisateurs_select" ON utilisateurs FOR SELECT
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

-- INSERT: allow for same enterprise
CREATE POLICY "utilisateurs_insert" ON utilisateurs FOR INSERT
  WITH CHECK (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

-- UPDATE: own row or super_admin for anyone in enterprise
CREATE POLICY "utilisateurs_update" ON utilisateurs FOR UPDATE
  USING (
    id = auth.uid()
    OR (
      entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())
      AND (SELECT role FROM utilisateurs WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- DELETE: only super_admin can delete users in same enterprise
CREATE POLICY "utilisateurs_delete" ON utilisateurs FOR DELETE
  USING (
    entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())
    AND (SELECT role FROM utilisateurs WHERE id = auth.uid()) = 'super_admin'
  );
