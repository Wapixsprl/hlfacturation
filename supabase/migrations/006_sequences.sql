-- Séquences de numérotation comptable (sans trou)
CREATE TABLE IF NOT EXISTS sequences_numerotation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  type_doc TEXT NOT NULL,
  annee INTEGER NOT NULL,
  dernier_numero INTEGER DEFAULT 0,
  UNIQUE(entreprise_id, type_doc, annee)
);

-- Fonction de génération de numéro séquentiel
CREATE OR REPLACE FUNCTION generate_numero(p_type TEXT, p_entreprise_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_annee INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_seq INTEGER;
BEGIN
  INSERT INTO sequences_numerotation (entreprise_id, type_doc, annee, dernier_numero)
  VALUES (p_entreprise_id, p_type, v_annee, 1)
  ON CONFLICT (entreprise_id, type_doc, annee)
  DO UPDATE SET dernier_numero = sequences_numerotation.dernier_numero + 1
  RETURNING dernier_numero INTO v_seq;

  RETURN p_type || '-' || v_annee || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
