-- Add 'equipe' and 'resp_equipe' roles to utilisateurs
-- equipe: read-only planning + can fill photos/journal entries
-- resp_equipe: access chantiers + planning, can manage chantiers

ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;
ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('super_admin', 'utilisateur', 'comptable', 'ouvrier', 'equipe', 'resp_equipe'));
