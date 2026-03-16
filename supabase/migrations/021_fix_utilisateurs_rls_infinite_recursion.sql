-- Fix infinite recursion in RLS policies on utilisateurs
-- The previous policies referenced utilisateurs in their own USING clause,
-- which triggered the same RLS check again → infinite loop.
-- Solution: SECURITY DEFINER helper functions that bypass RLS.

CREATE OR REPLACE FUNCTION auth_user_entreprise_id()
RETURNS UUID AS $$
  SELECT entreprise_id FROM public.utilisateurs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.utilisateurs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop all existing policies
DROP POLICY IF EXISTS "utilisateurs_select" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_insert" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_update" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_delete" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_read_own" ON utilisateurs;
DROP POLICY IF EXISTS "utilisateurs_update_own" ON utilisateurs;

-- Recreate with helper functions (no recursion)
CREATE POLICY "utilisateurs_select" ON utilisateurs FOR SELECT
  USING (entreprise_id = auth_user_entreprise_id());

CREATE POLICY "utilisateurs_insert" ON utilisateurs FOR INSERT
  WITH CHECK (entreprise_id = auth_user_entreprise_id());

CREATE POLICY "utilisateurs_update" ON utilisateurs FOR UPDATE
  USING (
    id = auth.uid()
    OR (
      entreprise_id = auth_user_entreprise_id()
      AND auth_user_role() = 'super_admin'
    )
  );

CREATE POLICY "utilisateurs_delete" ON utilisateurs FOR DELETE
  USING (
    entreprise_id = auth_user_entreprise_id()
    AND auth_user_role() = 'super_admin'
  );
