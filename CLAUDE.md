# CLAUDE.md — Application de Facturation HL Rénovation

> Ce fichier est le point d'entrée unique pour tout développement sur ce projet.
> Lis-le intégralement avant d'écrire la moindre ligne de code.
>
> ⚠️ Ce fichier est committé sur un repo PUBLIC. Il ne contient AUCUN secret.
> Toutes les clés et mots de passe sont dans `.env.local` (ignoré par git).

---

## 🤖 Autorisations Claude

Claude a les autorisations permanentes suivantes sur ce projet, **sans jamais demander confirmation** :

- ✅ **Recherches web** : effectuer des recherches pour trouver de la documentation, des exemples, des packages, des solutions techniques
- ✅ **Création et modification de fichiers** : créer, modifier, supprimer des fichiers directement dans le dossier source du projet sans demander la permission
- ✅ **Exécution de commandes** : pnpm install, migrations SQL, génération de types, scripts de build
- ✅ **Commits Git** : stage et commit des fichiers (sauf `.env.local` et tout ce qui est dans `.gitignore`)

---

## 🏢 Contexte Projet

**Client :** HL Rénovation — Hamza Lawrizy
**Site :** https://hlrenovation.be
**Secteur :** Rénovation intérieure, chauffage, climatisation, salle de bain — Tournai, Belgique
**Agence :** WAPIX.be
**Objectif :** Remplacer Vertuoza par une app de facturation sur mesure, plus économique et ciblée
**Utilisateurs :** 5 personnes max — 3 rôles distincts
**Langue :** Français (BE) exclusivement
**TVA :** Belgique — régime normal assujetti

---

## 🌐 Infrastructure

| Service | Détail |
|---|---|
| **GitHub** | `Wapixsprl/hlfacturation` (Public) — branche principale `main` |
| **Supabase** | Projet `Hlfacturation` — AWS eu-west-1 — PostgreSQL 15 |
| **Vercel** | Déploiement auto depuis GitHub (`main` → prod / `develop` → staging) |
| **Email** | Brevo SMTP — expéditeur `hlfacturation@wapix.io` |
| **Domaine app** | À configurer : `app.hlrenovation.be` → Vercel |

### Setup Vercel (1 seule fois)
1. https://vercel.com → **Import Git Repository** → `Wapixsprl/hlfacturation`
2. Framework : **Next.js** (auto-détecté)
3. **Settings > Environment Variables** : ajouter toutes les variables listées dans `.env.example`
4. Deploy → obtenir l'URL Vercel → configurer le domaine `app.hlrenovation.be`

### Variables à configurer dans Vercel Dashboard
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_PASSWORD
BREVO_API_KEY
BREVO_SMTP_LOGIN
BREVO_SMTP_KEY
BREVO_EXPEDITEUR_EMAIL
BREVO_EXPEDITEUR_NOM
NEXT_PUBLIC_APP_URL
BREVO_TEMPLATE_DEVIS_ENVOYE
BREVO_TEMPLATE_DEVIS_RELANCE
BREVO_TEMPLATE_FACTURE_ENVOYEE
BREVO_TEMPLATE_FACTURE_RELANCE
```

---

## 🛠️ Stack Technique

### Frontend
- **Framework :** Next.js 14+ (App Router)
- **UI :** Tailwind CSS + shadcn/ui
- **State :** Zustand (global) + TanStack Query (server state)
- **Forms :** React Hook Form + Zod
- **PDF viewer :** react-pdf
- **Signature :** `signature_pad` (canvas HTML5)
- **Drag & drop :** @dnd-kit/sortable
- **Dates :** date-fns (locale `fr-BE`)
- **Charts :** Recharts
- **Icônes :** Lucide React
- **Toasts :** Sonner

### Backend / BDD
- **BDD :** Supabase PostgreSQL 15 — AWS eu-west-1
- **Auth :** Supabase Auth (JWT + RLS)
- **Storage :** Supabase Storage (PDFs, logos, pièces jointes)
- **API :** Next.js API Routes
- **PDF :** @react-pdf/renderer (côté serveur)
- **Email :** @getbrevo/brevo — SMTP smtp-relay.brevo.com:587
- **TVA :** API VIES Europa.eu (SOAP)
- **Import :** xlsx (SheetJS)

### Tooling
- **Package manager :** pnpm
- **Linter :** ESLint + Prettier
- **Types :** TypeScript strict
- **Commits :** Conventional Commits (`feat:` `fix:` `chore:`)
- **CI/CD :** Vercel auto-deploy

---

## 📁 Structure du Projet

```
hlfacturation/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── reset-password/
│   ├── (app)/                    # Routes protégées
│   │   ├── layout.tsx            # Sidebar + auth guard
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── produits/
│   │   ├── devis/[id]/
│   │   ├── factures/[id]/
│   │   ├── fournisseurs/
│   │   ├── factures-achat/[id]/
│   │   ├── tresorerie/
│   │   └── parametres/
│   ├── devis/[token]/            # Page publique signature (NO auth)
│   ├── api/
│   │   ├── clients/
│   │   ├── produits/
│   │   ├── devis/[id]/pdf/
│   │   ├── devis/[id]/envoyer/
│   │   ├── devis/[token]/signer/
│   │   ├── factures/[id]/pdf/
│   │   ├── factures/[id]/envoyer/
│   │   ├── factures-achat/
│   │   ├── tresorerie/import/
│   │   └── tva/verifier/
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui (auto-généré)
│   ├── layout/                   # Sidebar, Header, Breadcrumb
│   ├── dashboard/
│   ├── clients/
│   ├── devis/
│   ├── factures/
│   ├── signature/
│   ├── tresorerie/
│   └── shared/
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── supabase/middleware.ts
│   ├── brevo/emails.ts
│   ├── pdf/devis-template.tsx
│   ├── pdf/facture-template.tsx
│   ├── auth/permissions.ts
│   ├── validations/
│   ├── hooks/
│   └── utils.ts
├── types/database.ts
├── supabase/migrations/
├── supabase/seed.sql
├── public/logo-hl.png
├── public/manifest.json
├── .env.local                    # ⚠️ SECRETS — jamais committé
├── .env.example                  # Template public
├── .gitignore
├── CLAUDE.md
└── README.md
```

---

## 🗄️ Schéma Base de Données

### Conventions
- `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- `created_at / updated_at TIMESTAMPTZ DEFAULT NOW()`
- Soft delete : `archived_at TIMESTAMPTZ NULL`
- `entreprise_id` sur toutes les tables
- RLS activé sur toutes les tables

### Tables

```sql
CREATE TABLE entreprises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  adresse TEXT, code_postal TEXT, ville TEXT, pays TEXT DEFAULT 'BE',
  tva_numero TEXT, iban TEXT, telephone TEXT, email TEXT, logo_url TEXT,
  conditions_paiement_defaut TEXT DEFAULT 'Comptant',
  delai_validite_devis_jours INTEGER DEFAULT 30,
  mention_tva_defaut TEXT,
  seuil_alerte_tresorerie DECIMAL(12,2) DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE utilisateurs (
  id UUID REFERENCES auth.users PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  nom TEXT, prenom TEXT, email TEXT NOT NULL,
  role TEXT CHECK (role IN ('super_admin','utilisateur','comptable')) DEFAULT 'utilisateur',
  actif BOOLEAN DEFAULT true,
  derniere_connexion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  type TEXT CHECK (type IN ('particulier','professionnel')) DEFAULT 'particulier',
  nom TEXT, prenom TEXT, raison_sociale TEXT,
  adresse TEXT, code_postal TEXT, ville TEXT, pays TEXT DEFAULT 'BE',
  email TEXT, telephone TEXT, telephone2 TEXT,
  tva_numero TEXT, tva_valide BOOLEAN,
  iban TEXT, notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fournisseurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  raison_sociale TEXT NOT NULL, contact_nom TEXT,
  adresse TEXT, code_postal TEXT, ville TEXT, pays TEXT DEFAULT 'BE',
  email TEXT, telephone TEXT, tva_numero TEXT, iban TEXT, notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE produits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  reference TEXT, designation TEXT NOT NULL, description TEXT,
  categorie TEXT CHECK (categorie IN ('materiaux','main_oeuvre','sous_traitance','equipement','forfait','autre')),
  prix_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  prix_achat_ht DECIMAL(12,2),
  taux_tva DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  unite TEXT CHECK (unite IN ('h','j','forfait','m2','m3','ml','piece','lot','kg','l','autre')) DEFAULT 'piece',
  actif BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Séquences numérotation comptable (sans trou)
CREATE TABLE sequences_numerotation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  type_doc TEXT NOT NULL,
  annee INTEGER NOT NULL,
  dernier_numero INTEGER DEFAULT 0,
  UNIQUE(entreprise_id, type_doc, annee)
);

CREATE OR REPLACE FUNCTION generate_numero(p_type TEXT, p_entreprise_id UUID)
RETURNS TEXT AS $$
DECLARE v_annee INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER; v_seq INTEGER;
BEGIN
  INSERT INTO sequences_numerotation (entreprise_id, type_doc, annee, dernier_numero)
  VALUES (p_entreprise_id, p_type, v_annee, 1)
  ON CONFLICT (entreprise_id, type_doc, annee)
  DO UPDATE SET dernier_numero = sequences_numerotation.dernier_numero + 1
  RETURNING dernier_numero INTO v_seq;
  RETURN p_type || '-' || v_annee || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE devis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  numero TEXT UNIQUE NOT NULL,
  statut TEXT CHECK (statut IN ('brouillon','envoye','accepte','refuse','expire','converti')) DEFAULT 'brouillon',
  titre TEXT, reference_chantier TEXT,
  date_devis DATE DEFAULT CURRENT_DATE, date_validite DATE,
  conditions_paiement TEXT,
  acomptes_config JSONB DEFAULT '[]',
  introduction TEXT, conclusion TEXT, notes_internes TEXT,
  total_ht DECIMAL(12,2) DEFAULT 0, total_tva DECIMAL(12,2) DEFAULT 0, total_ttc DECIMAL(12,2) DEFAULT 0,
  token_signature TEXT UNIQUE, token_expiration TIMESTAMPTZ,
  signature_image TEXT, signature_ip TEXT, signature_date TIMESTAMPTZ, signature_user_agent TEXT,
  pdf_url TEXT, archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE devis_lignes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id UUID REFERENCES devis ON DELETE CASCADE NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  type TEXT CHECK (type IN ('produit','texte','section','saut_page')) DEFAULT 'produit',
  produit_id UUID REFERENCES produits,
  designation TEXT, description TEXT,
  quantite DECIMAL(10,3) DEFAULT 1, unite TEXT,
  prix_unitaire_ht DECIMAL(12,2) DEFAULT 0,
  remise_pct DECIMAL(5,2) DEFAULT 0, taux_tva DECIMAL(5,2) DEFAULT 21.00,
  total_ht DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE factures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  client_id UUID REFERENCES clients NOT NULL,
  devis_id UUID REFERENCES devis,
  numero TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('facture','acompte','avoir','situation')) DEFAULT 'facture',
  statut TEXT CHECK (statut IN ('brouillon','envoyee','partiellement_payee','payee','en_retard')) DEFAULT 'brouillon',
  date_facture DATE DEFAULT CURRENT_DATE, date_echeance DATE,
  mention_tva TEXT, conditions_paiement TEXT,
  total_ht DECIMAL(12,2) DEFAULT 0, total_tva DECIMAL(12,2) DEFAULT 0, total_ttc DECIMAL(12,2) DEFAULT 0,
  montant_acomptes_deduits DECIMAL(12,2) DEFAULT 0, solde_ttc DECIMAL(12,2) DEFAULT 0,
  pdf_url TEXT, notes_internes TEXT, archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE factures_lignes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_id UUID REFERENCES factures ON DELETE CASCADE NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  type TEXT CHECK (type IN ('produit','texte','section')) DEFAULT 'produit',
  produit_id UUID REFERENCES produits,
  designation TEXT, description TEXT,
  quantite DECIMAL(10,3) DEFAULT 1, unite TEXT,
  prix_unitaire_ht DECIMAL(12,2) DEFAULT 0,
  remise_pct DECIMAL(5,2) DEFAULT 0, taux_tva DECIMAL(5,2) DEFAULT 21.00,
  total_ht DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paiements_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  facture_id UUID REFERENCES factures NOT NULL,
  date_paiement DATE NOT NULL, montant DECIMAL(12,2) NOT NULL,
  mode TEXT CHECK (mode IN ('virement','cheque','cash','carte','autre')) DEFAULT 'virement',
  reference_bancaire TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE factures_achat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  fournisseur_id UUID REFERENCES fournisseurs NOT NULL,
  devis_id UUID REFERENCES devis,
  numero_fournisseur TEXT,
  statut TEXT CHECK (statut IN ('a_payer','partiellement_paye','paye','en_retard')) DEFAULT 'a_payer',
  date_facture DATE NOT NULL,
  categorie TEXT CHECK (categorie IN ('materiaux','sous_traitance','carburant','assurance','outillage','telecom','autre')) DEFAULT 'autre',
  total_ht DECIMAL(12,2) DEFAULT 0, total_tva DECIMAL(12,2) DEFAULT 0, total_ttc DECIMAL(12,2) NOT NULL,
  fichier_url TEXT, notes TEXT, archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE echeances_fournisseurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facture_achat_id UUID REFERENCES factures_achat ON DELETE CASCADE NOT NULL,
  date_echeance DATE NOT NULL, montant DECIMAL(12,2) NOT NULL,
  statut TEXT CHECK (statut IN ('a_payer','paye','en_retard')) DEFAULT 'a_payer',
  date_paiement DATE, mode_paiement TEXT CHECK (mode_paiement IN ('virement','cheque','cash','autre')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mouvements_tresorerie (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entreprise_id UUID REFERENCES entreprises NOT NULL,
  date_mouvement DATE NOT NULL, libelle TEXT NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('encaissement_client','paiement_fournisseur','autre_entree','autre_sortie')),
  facture_id UUID REFERENCES factures,
  facture_achat_id UUID REFERENCES factures_achat,
  rapproche BOOLEAN DEFAULT false, reference_bancaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Sécurité & Permissions

### RLS (à appliquer sur chaque table)
```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entreprise_isolation" ON clients FOR ALL
  USING (entreprise_id = (SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid()));
```

### Matrice permissions
```typescript
// lib/auth/permissions.ts
export const PERMISSIONS = {
  clients:        { read: ['super_admin','utilisateur','comptable'], write: ['super_admin','utilisateur'] },
  produits:       { read: ['super_admin','utilisateur'],             write: ['super_admin'] },
  devis:          { read: ['super_admin','utilisateur','comptable'], write: ['super_admin','utilisateur'] },
  factures:       { read: ['super_admin','comptable'],               write: ['super_admin','comptable'] },
  factures_achat: { read: ['super_admin','comptable'],               write: ['super_admin','comptable'] },
  tresorerie:     { read: ['super_admin','comptable'],               write: ['super_admin','comptable'] },
  parametres:     { read: ['super_admin'],                           write: ['super_admin'] },
}
```

### Token signature devis
- UUID v4 généré côté serveur — stocké en base
- Expiration 30 jours — usage unique (invalidé après signature)
- Page `/devis/[token]` : route 100% publique, expose uniquement les données du devis concerné
- Log sécurité : IP + user-agent + timestamp ISO stockés avec la signature

---

## 🎨 Design System

### Couleurs HL Rénovation
```typescript
// tailwind.config.ts
colors: {
  hl: {
    primary:      '#1B3A6B',  // Bleu marine
    accent:       '#E07B2A',  // Orange
    success:      '#16A34A',
    warning:      '#D97706',
    danger:       '#DC2626',
    'grey-bg':    '#F8FAFC',
    'grey-border':'#E2E8F0',
  }
}
```

### shadcn/ui init
```bash
pnpm dlx shadcn-ui@latest init  # Style: Default | Color: Slate | CSS vars: Yes
pnpm dlx shadcn-ui@latest add button input label select textarea \
  table dialog sheet badge dropdown-menu tabs card separator \
  calendar popover form command tooltip
```

### Layout
- Sidebar fixe 240px desktop → Drawer mobile
- Header : fil d'Ariane + avatar + logout
- Content : `px-6 py-4 max-w-7xl mx-auto`

---

## 📧 Brevo — Emails

**Serveur :** `smtp-relay.brevo.com:587`
**Expéditeur :** `hlfacturation@wapix.io`

### Templates à créer dans Brevo Dashboard
| Variable env | Sujet | Déclencheur |
|---|---|---|
| `BREVO_TEMPLATE_DEVIS_ENVOYE` | Votre devis {{numero}} — HL Rénovation | Envoi devis |
| `BREVO_TEMPLATE_DEVIS_ACCEPTE_CLIENT` | ✅ Devis {{numero}} confirmé | Post-signature client |
| `BREVO_TEMPLATE_DEVIS_ACCEPTE_INTERNE` | ✅ {{client}} a signé le devis {{numero}} | Notif interne |
| `BREVO_TEMPLATE_DEVIS_RELANCE` | Rappel : devis {{numero}} expire le {{date}} | Auto J+7, J+14 |
| `BREVO_TEMPLATE_FACTURE_ENVOYEE` | Facture {{numero}} — HL Rénovation | Envoi facture |
| `BREVO_TEMPLATE_FACTURE_RELANCE` | ⚠️ Facture {{numero}} — Rappel paiement | Auto J+7, J+15, J+30 |

---

## 📄 Génération PDF

- Utiliser `@react-pdf/renderer` côté API Route (serveur)
- `GET /api/devis/[id]/pdf` → retourne `application/pdf`
- Stocker sur Supabase Storage bucket `pdfs`
- Régénérer si document modifié

**Contenu PDF devis :** logo + coordonnées + TVA | coordonnées client | numéro + dates | tableau lignes avec sections | récap TVA par taux | total HT/TVA/TTC | échéancier acomptes | mentions légales | si signé : encadré signature (image + date + IP)

---

## 🔌 Validation TVA Belge

```typescript
// lib/utils/tva.ts — API VIES Europa (SOAP)
export async function verifierTVA(numero: string) {
  const n = numero.replace(/^BE/i, '').replace(/[\.\s]/g, '')
  const soap = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
    <soapenv:Body><urn:checkVat>
      <urn:countryCode>BE</urn:countryCode>
      <urn:vatNumber>${n}</urn:vatNumber>
    </urn:checkVat></soapenv:Body></soapenv:Envelope>`
  const res = await fetch('http://ec.europa.eu/taxation_customs/vies/services/checkVatService',
    { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: soap })
  const xml = await res.text()
  return {
    valide: xml.includes('<valid>true</valid>'),
    nom: xml.match(/<name>(.*?)<\/name>/)?.[1] || '',
    adresse: xml.match(/<address>(.*?)<\/address>/)?.[1] || '',
  }
}
```

---

## 📱 PWA

```json
// public/manifest.json
{ "name": "HL Facturation", "short_name": "HL Fact",
  "theme_color": "#1B3A6B", "background_color": "#F8FAFC",
  "display": "standalone", "start_url": "/dashboard",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

---

## 🚀 Initialisation

```bash
# 1. Clone
git clone https://github.com/Wapixsprl/hlfacturation.git && cd hlfacturation

# 2. Env
cp .env.example .env.local  # Remplir avec les vraies valeurs

# 3. Install
pnpm install

# 4. Migrations Supabase (via Dashboard > SQL Editor, dans l'ordre)
# supabase/migrations/001 → 012

# 5. Dev
pnpm dev  # → http://localhost:3000
```

### Ordre de développement Phase 1 (MVP)
1. `feat/auth` — Login, middleware, guards
2. `feat/layout` — Sidebar, Header, mobile responsive
3. `feat/clients` — CRUD + validation TVA VIES
4. `feat/produits` — CRUD catalogue
5. `feat/devis` — Création + lignes + calculs + PDF
6. `feat/devis-signature` — Page publique + canvas + Brevo
7. `feat/dashboard` — KPIs par rôle

---

## ⚙️ Conventions

### Nommage
| Type | Convention | Exemple |
|---|---|---|
| Composants | PascalCase | `ClientForm.tsx` |
| Hooks | `use` + camelCase | `useClients.ts` |
| Utils | camelCase | `formatMontant.ts` |
| API routes | kebab-case | `/api/factures-achat/` |
| Tables BDD | snake_case pluriel | `devis_lignes` |

### Utilitaires essentiels
```typescript
// lib/utils.ts
export const formatMontant = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)

export const formatDate = (d: string | Date) =>
  new Intl.DateTimeFormat('fr-BE', { dateStyle: 'short' }).format(new Date(d))

export function calculerLigne(q: number, pu: number, remise: number, tva: number) {
  const ht = q * pu * (1 - remise / 100)
  const tvaMontant = ht * (tva / 100)
  const round = (n: number) => Math.round(n * 100) / 100
  return { ht: round(ht), tva: round(tvaMontant), ttc: round(ht + tvaMontant) }
}
```

---

## ⚠️ Points Critiques

### Numérotation comptable belge
Utiliser **exclusivement** `generate_numero()` côté PostgreSQL. Jamais côté JS. Séquentielle sans trou = obligation légale.

### Mentions légales obligatoires sur factures (BE)
N° TVA vendeur + acheteur • N° séquentiel • Date • Description • HT + TVA + TTC • Conditions paiement • "Autoliquidation" si cocontractant

### Signature eIDAS
**Signature simple** (non qualifiée). Valeur probatoire pour devis commerciaux. Conservation 5 ans minimum.

### Supabase Storage — Buckets à créer
- `pdfs` (privé) — devis et factures générés
- `uploads` (privé) — factures fournisseurs
- `logos` (public) — logo entreprise

### Sécurité repo PUBLIC
`.env.local` doit être dans `.gitignore`. Vérifier avant chaque commit. Variables uniquement dans Vercel Dashboard.

---

## 📞 Contacts

| | |
|---|---|
| Client | Hamza Lawrizy — hl.gorilleentreprise@gmail.com — +32 485 19 75 64 |
| Agence | WAPIX.be |
| GitHub | github.com/Wapixsprl/hlfacturation |
| Email SMTP | smtp-relay.brevo.com:587 — hlfacturation@wapix.io |

---

*Mars 2026 — WAPIX.be*
