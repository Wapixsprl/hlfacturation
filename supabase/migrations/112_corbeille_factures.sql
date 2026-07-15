-- Table corbeille : snapshot immuable des factures supprimées
-- Pas de FK, pas de RLS active sur les données métier — simple coffre-fort
-- Le numéro est suffixé _del pour libérer le slot dans factures

CREATE TABLE IF NOT EXISTS corbeille_factures (
  id                   UUID PRIMARY KEY,
  numero_original      TEXT NOT NULL,
  numero_del           TEXT NOT NULL,          -- ex: FAC-2026-0101_del
  entreprise_id        UUID NOT NULL,
  client_id            UUID NOT NULL,
  data                 JSONB NOT NULL,          -- snapshot complet de la ligne factures
  lignes               JSONB NOT NULL DEFAULT '[]',   -- snapshot factures_lignes
  paiements            JSONB NOT NULL DEFAULT '[]',   -- snapshot paiements_clients
  archived_at          TIMESTAMPTZ,            -- date de l'archivage initial (depuis factures)
  mis_en_corbeille_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Pas de RLS, c'est voulu (table de log interne)

-- Copie des 109 factures archivées → corbeille
INSERT INTO corbeille_factures
  (id, numero_original, numero_del, entreprise_id, client_id, data, lignes, paiements, archived_at)
SELECT
  f.id,
  f.numero,
  f.numero || '_del',
  f.entreprise_id,
  f.client_id,
  to_jsonb(f),
  COALESCE(
    (SELECT jsonb_agg(to_jsonb(fl) ORDER BY fl.ordre)
     FROM factures_lignes fl WHERE fl.facture_id = f.id),
    '[]'::jsonb
  ),
  COALESCE(
    (SELECT jsonb_agg(to_jsonb(pc) ORDER BY pc.date_paiement)
     FROM paiements_clients pc WHERE pc.facture_id = f.id),
    '[]'::jsonb
  ),
  f.archived_at
FROM factures f
WHERE f.archived_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Libérer les FK sans CASCADE avant de supprimer
-- mouvements_tresorerie : on nullifie le lien (le mouvement reste, la facture disparaît)
UPDATE mouvements_tresorerie
SET facture_id = NULL
WHERE facture_id IN (SELECT id FROM factures WHERE archived_at IS NOT NULL);

-- paiements_clients : déjà dans le snapshot, on supprime
DELETE FROM paiements_clients
WHERE facture_id IN (SELECT id FROM factures WHERE archived_at IS NOT NULL);

-- payment_sessions : on nullifie le lien (session de paiement en ligne)
UPDATE payment_sessions
SET facture_id = NULL
WHERE facture_id IN (SELECT id FROM factures WHERE archived_at IS NOT NULL);

-- Suppression des factures archivées (CASCADE sur factures_lignes + execution_facturations)
DELETE FROM factures WHERE archived_at IS NOT NULL;
