-- 029: Permissions de pages par rôle et par entreprise (configurable par super_admin)

CREATE TABLE role_page_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises(id) NOT NULL,
  role TEXT NOT NULL,
  page TEXT NOT NULL,
  actif BOOLEAN DEFAULT true NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entreprise_id, role, page)
);

CREATE INDEX idx_role_page_perms ON role_page_permissions(entreprise_id, role);

ALTER TABLE role_page_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entreprise_isolation" ON role_page_permissions FOR ALL
  USING (entreprise_id = auth_user_entreprise_id());
