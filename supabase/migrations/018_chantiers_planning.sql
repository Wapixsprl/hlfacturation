-- ============================================================
-- Migration 018: Module Chantiers / Planning / Journal
-- ============================================================

-- 1. Ajouter le rôle 'ouvrier' aux utilisateurs
ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_role_check;
ALTER TABLE utilisateurs ADD CONSTRAINT utilisateurs_role_check
  CHECK (role IN ('super_admin','utilisateur','comptable','ouvrier'));

-- 2. Table equipes
CREATE TABLE equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  nom TEXT NOT NULL,
  couleur TEXT NOT NULL DEFAULT '#17C2D7',
  responsable_id UUID REFERENCES utilisateurs,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table membres_equipe
CREATE TABLE membres_equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipe_id UUID REFERENCES equipes ON DELETE CASCADE NOT NULL,
  utilisateur_id UUID REFERENCES utilisateurs ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(equipe_id, utilisateur_id)
);

-- 4. Table chantiers
CREATE TABLE chantiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  devis_id UUID REFERENCES devis,
  client_id UUID REFERENCES clients NOT NULL,
  numero TEXT UNIQUE NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  statut TEXT CHECK (statut IN ('a_planifier','planifie','en_cours','termine','livre')) DEFAULT 'a_planifier',
  priorite TEXT CHECK (priorite IN ('basse','normale','haute','urgente')) DEFAULT 'normale',
  date_debut DATE,
  date_fin_prevue DATE,
  date_fin_reelle DATE,
  equipe_id UUID REFERENCES equipes,
  budget_ht DECIMAL(12,2) DEFAULT 0,
  cout_reel_ht DECIMAL(12,2) DEFAULT 0,
  notes_internes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table taches_chantier
CREATE TABLE taches_chantier (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID REFERENCES chantiers ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  date_debut DATE,
  date_fin DATE,
  duree_jours INTEGER DEFAULT 1,
  dependance_id UUID REFERENCES taches_chantier,
  equipe_id UUID REFERENCES equipes,
  statut TEXT CHECK (statut IN ('a_faire','en_cours','termine')) DEFAULT 'a_faire',
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table journal_chantier
CREATE TABLE journal_chantier (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID REFERENCES chantiers ON DELETE CASCADE NOT NULL,
  auteur_id UUID REFERENCES utilisateurs NOT NULL,
  date_entree DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT CHECK (type IN ('commentaire','photo','incident','livraison_materiel','avancement','reception')) DEFAULT 'commentaire',
  contenu TEXT,
  photos JSONB DEFAULT '[]',
  meteo TEXT CHECK (meteo IN ('ensoleille','nuageux','pluie','neige')),
  avancement_pct INTEGER CHECK (avancement_pct >= 0 AND avancement_pct <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table pv_reception
CREATE TABLE pv_reception (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID REFERENCES chantiers ON DELETE CASCADE NOT NULL,
  date_reception DATE NOT NULL DEFAULT CURRENT_DATE,
  observations TEXT,
  reserves JSONB DEFAULT '[]',
  photos_avant JSONB DEFAULT '[]',
  photos_apres JSONB DEFAULT '[]',
  token_signature TEXT UNIQUE,
  token_expiration TIMESTAMPTZ,
  signature_client TEXT,
  signature_date TIMESTAMPTZ,
  signature_ip TEXT,
  signature_user_agent TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table sous_traitants_chantier
CREATE TABLE sous_traitants_chantier (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID REFERENCES chantiers ON DELETE CASCADE NOT NULL,
  fournisseur_id UUID REFERENCES fournisseurs NOT NULL,
  role TEXT,
  montant_prevu_ht DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chantier_id, fournisseur_id)
);

-- 9. RLS sur toutes les nouvelles tables
ALTER TABLE equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON equipes FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

ALTER TABLE membres_equipe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON membres_equipe FOR ALL
  USING (equipe_id IN (SELECT id FROM equipes WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON chantiers FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));

ALTER TABLE taches_chantier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON taches_chantier FOR ALL
  USING (chantier_id IN (SELECT id FROM chantiers WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));

ALTER TABLE journal_chantier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON journal_chantier FOR ALL
  USING (chantier_id IN (SELECT id FROM chantiers WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));

ALTER TABLE pv_reception ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON pv_reception FOR ALL
  USING (chantier_id IN (SELECT id FROM chantiers WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));

ALTER TABLE sous_traitants_chantier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON sous_traitants_chantier FOR ALL
  USING (chantier_id IN (SELECT id FROM chantiers WHERE entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid())));

-- 10. Triggers updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON equipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chantiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON taches_chantier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON journal_chantier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON pv_reception FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Bucket Storage pour photos chantier
INSERT INTO storage.buckets (id, name, public) VALUES ('chantiers', 'chantiers', false) ON CONFLICT DO NOTHING;
