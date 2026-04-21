# CLAUDEPEPPOL.md — Intégration e-Invoicing Peppol — HL Facturation

> Module complémentaire à lire APRÈS `CLAUDE.md`.
> Ce fichier décrit exclusivement l'intégration Peppol via e-invoice.be.
> Toutes les conventions du projet principal (stack, nommage, RLS, commits) s'appliquent sans exception.

---

## 📋 Contexte Réglementaire

Depuis le **1er janvier 2026**, la facturation électronique B2B est obligatoire en Belgique pour toutes les entreprises assujetties à la TVA. HL Rénovation est concernée : elle émet des factures à des clients professionnels belges (B2B).

- **Format imposé :** Peppol BIS 3.0 / UBL 2.1 (norme EN 16931)
- **Canal imposé :** réseau Peppol via un Access Point certifié
- **Tolérance Q1 2026 :** aucune sanction jusqu'au 31 mars 2026 si bonne foi démontrée
- **e-Reporting 2028 :** extension Peppol 5-corner — hors périmètre de ce CDC
- **Scope :** uniquement les factures B2B (clients `type = 'professionnel'`). Les particuliers sont hors obligation.

---

## 🔌 Solution Retenue : e-invoice.be

> ⚠️ **MISE À JOUR AVRIL 2026** — Informations vérifiées directement sur le site et l'onboarding.

**Pourquoi e-invoice.be :**
- SDK TypeScript/Node.js natif (`e-invoice-api` sur npm) — intégration native Next.js
- **Seulement 2 appels API** : `POST /api/documents` puis `POST /api/documents/:id/send`
- Pay-per-use — **aucun frais mensuel fixe, aucun coût API** — on ne paie que les e-factures réellement envoyées
- **Plan Pro : €0.25/facture** (packages à partir de €350) — API + webhooks inclus
- **Plan Enterprise : €0.18/facture** — remises volume, multi-team, analytics avancés
- À 2000 factures/an → **€360/an** (Enterprise) — déductible à **120%** fiscalement (BE 2024-2027)
- Access Point Peppol certifié belge, données hébergées en Europe (99.9% uptime, <200ms)
- Enregistrement Peppol automatique à la création du compte (KYC 48h)
- Fallback email automatique si le destinataire n'est pas inscrit sur Peppol
- **MCP Server disponible** — intégration directe avec Claude Code (voir section dédiée)

### ⚠️ Onboarding — Services à sélectionner

Lors de la création du compte `app.e-invoice.be` **au nom de HL Rénovation** (pas WAPIX) :

| Service | Sélectionner ? | Raison |
|---|---|---|
| **Receive Invoices** | ✅ Oui | Réception factures fournisseurs Peppol |
| **Send UBL** | ✅ Oui | Envoi via SDK (l'app génère l'UBL) |
| **Send Basic PDF** (€250 one-time) | ❌ Non | Inutile — le SDK n'envoie pas de PDF |
| **Send Advanced PDF** (€2500 one-time) | ❌ Non | Inutile |
| **Standard Support** (€200/an) | ⚠️ Optionnel | Email support 72h — pas obligatoire pour l'API |

> ❌ **Erreur à éviter :** Ne pas enregistrer WAPIX SPRL — c'est HL Rénovation (TVA : BE0...) qui doit être inscrite comme émetteur Peppol.

**Documentation API :** `docs.e-invoice.be`

---

## 🌿 Branche Git

```bash
git checkout develop
git checkout -b feat/peppol-einvoice
```

Merger via PR vers `develop`, puis `develop` → `main` après validation.

---

## 📦 Installation

```bash
pnpm add e-invoice-api
```

Aucune autre dépendance requise.

---

## 🤖 MCP Server — Claude Code Integration

> ⚠️ **NOUVEAU — Ajout avril 2026**

e-invoice.be publie un **Peppol MCP Server** officiel compatible Claude Code, Cursor et tout agent MCP. Cela permet à Claude Code d'appeler directement l'API e-invoice.be pendant le développement, sans avoir à coder manuellement le wrapper.

### Configuration dans `.mcp.json` du projet

```json
{
  "mcpServers": {
    "e_invoice_api": {
      "command": "npx",
      "args": ["-y", "e-invoice-api-mcp"],
      "env": {
        "E_INVOICE_API_KEY": "ei_live_xxxxxxxxxxxx",
        "E_INVOICE_ENVIRONMENT": "development"
      }
    }
  }
}
```

### Ce que ça change concrètement

- Claude Code peut tester les appels Peppol **directement depuis le terminal** pendant le développement
- Supprime le besoin du script de test séparé `scripts/test-peppol.ts`
- Garder `"development"` pendant tout le dev de `feat/peppol-einvoice`
- Passer `"production"` uniquement après validation complète en sandbox

> ⚠️ Ne jamais committer `.mcp.json` avec la clé API. Utiliser les variables d'environnement système ou `.env.local`. Ajouter `.mcp.json` au `.gitignore`.

---

## 🔑 Variables d'Environnement

### Ajouter dans `.env.local`
```
E_INVOICE_API_KEY=ei_live_xxxxxxxxxxxx
E_INVOICE_LEGAL_ENTITY_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Ajouter dans `.env.example` (sans valeurs)
```
E_INVOICE_API_KEY=
E_INVOICE_LEGAL_ENTITY_ID=
```

### Ajouter dans Vercel Dashboard
```
E_INVOICE_API_KEY
E_INVOICE_LEGAL_ENTITY_ID
```

⚠️ Ces clés ne doivent JAMAIS apparaître côté client (`NEXT_PUBLIC_` interdit).

---

## 🗄️ Migration Base de Données

Fichier : `supabase/migrations/013_peppol.sql`

```sql
-- Extension colonnes table entreprises
ALTER TABLE entreprises
  ADD COLUMN peppol_id TEXT,               -- ex: 9925:BE0123456789
  ADD COLUMN peppol_actif BOOLEAN DEFAULT false;

-- Extension colonnes table clients
ALTER TABLE clients
  ADD COLUMN peppol_capable BOOLEAN DEFAULT false,
  ADD COLUMN peppol_id TEXT,               -- identifiant Peppol du client
  ADD COLUMN peppol_verifie_at TIMESTAMPTZ; -- date dernière vérification

-- Extension colonnes table factures
ALTER TABLE factures
  ADD COLUMN peppol_eligible BOOLEAN GENERATED ALWAYS AS (
    -- Calculé automatiquement : facture pro uniquement
    -- La valeur réelle est gérée côté applicatif via trigger
    false
  ) STORED,
  ADD COLUMN peppol_statut TEXT
    CHECK (peppol_statut IN (
      'non_applicable',   -- client particulier
      'en_attente',       -- client pro, pas encore envoyé
      'envoye',           -- soumis à e-invoice.be
      'livre',            -- confirmé livré au destinataire
      'email_fallback',   -- destinataire non Peppol, envoi par email
      'erreur'            -- échec livraison
    )) DEFAULT 'non_applicable',
  ADD COLUMN peppol_document_id TEXT,      -- GUID retourné par e-invoice.be
  ADD COLUMN peppol_envoye_at TIMESTAMPTZ,
  ADD COLUMN peppol_livre_at TIMESTAMPTZ,
  ADD COLUMN peppol_erreur TEXT;           -- message d'erreur si échec

-- Index pour les dashboards et filtres
CREATE INDEX idx_factures_peppol_statut ON factures(peppol_statut)
  WHERE peppol_statut IS NOT NULL;

CREATE INDEX idx_clients_peppol ON clients(peppol_capable)
  WHERE peppol_capable = true;

-- RLS : même politique que le reste des tables
-- (entreprise_id isolation déjà en place)
```

---

## 📁 Structure des Fichiers à Créer

```
lib/
└── peppol/
    ├── client.ts          # Instance singleton e-invoice-api
    ├── discovery.ts       # Vérification Peppol du destinataire
    ├── send.ts            # Envoi d'une facture via Peppol
    └── mapper.ts          # Transformation facture DB → payload e-invoice.be

app/api/
└── factures/
    └── [id]/
        ├── peppol-check/
        │   └── route.ts   # GET — vérifie si client est Peppol-capable
        └── peppol-send/
            └── route.ts   # POST — envoie la facture via Peppol

app/api/
└── webhooks/
    └── einvoice/
        └── route.ts       # POST — reçoit les notifications e-invoice.be
```

---

## 💻 Implémentation

### 1. Client singleton — `lib/peppol/client.ts`

```typescript
import EInvoice from 'e-invoice-api'

if (!process.env.E_INVOICE_API_KEY) {
  throw new Error('E_INVOICE_API_KEY manquante')
}

export const einvoiceClient = new EInvoice({
  apiKey: process.env.E_INVOICE_API_KEY,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
})
```

---

### 2. Vérification Peppol client — `lib/peppol/discovery.ts`

```typescript
import { einvoiceClient } from './client'
import { createClient } from '@/lib/supabase/server'

/**
 * Vérifie si un client est inscrit sur le réseau Peppol.
 * Met en cache le résultat en base (valide 7 jours).
 */
export async function checkPeppolCapability(clientId: string): Promise<{
  capable: boolean
  peppolId: string | null
}> {
  const supabase = createClient()

  // Récupérer le client
  const { data: client, error } = await supabase
    .from('clients')
    .select('tva_numero, peppol_capable, peppol_id, peppol_verifie_at')
    .eq('id', clientId)
    .single()

  if (error || !client) throw new Error('Client introuvable')

  // Client particulier → jamais Peppol
  if (!client.tva_numero) {
    return { capable: false, peppolId: null }
  }

  // Cache valide 7 jours
  const cacheExpire = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  if (
    client.peppol_verifie_at &&
    new Date(client.peppol_verifie_at) > cacheExpire
  ) {
    return {
      capable: client.peppol_capable ?? false,
      peppolId: client.peppol_id,
    }
  }

  // Requête discovery e-invoice.be
  // Le Peppol ID belge = 9925: + numéro TVA sans "BE"
  const vatClean = client.tva_numero.replace(/^BE/i, '').replace(/[\.\s]/g, '')
  const peppolId = `9925:BE${vatClean}`

  let capable = false
  try {
    const result = await einvoiceClient.discovery.check({
      peppolId,
      documentType: 'invoice',
    })
    capable = result.registered === true
  } catch {
    // En cas d'erreur API, on suppose non-capable (fallback email)
    capable = false
  }

  // Mise à jour en base
  await supabase
    .from('clients')
    .update({
      peppol_capable: capable,
      peppol_id: capable ? peppolId : null,
      peppol_verifie_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  return { capable, peppolId: capable ? peppolId : null }
}
```

---

### 3. Mapper facture → payload — `lib/peppol/mapper.ts`

```typescript
/**
 * Transforme une facture HL (avec ses lignes et client) 
 * en payload JSON compatible e-invoice.be
 */
export function mapFactureToEInvoicePayload(params: {
  facture: FactureComplete       // facture + lignes + client + entreprise
  peppolIdDestinataire: string  // ex: 9925:BE0123456789
  peppolIdEmetteur: string      // ex: 9925:BE0987654321
}) {
  const { facture, peppolIdDestinataire, peppolIdEmetteur } = params

  return {
    // Identification
    invoiceNumber: facture.numero,
    issueDate: facture.date_facture,
    dueDate: facture.date_echeance,
    currency: 'EUR',
    note: facture.notes_internes ?? undefined,

    // Émetteur (HL Rénovation)
    supplier: {
      name: facture.entreprise.nom,
      vatNumber: facture.entreprise.tva_numero,
      peppolId: peppolIdEmetteur,
      address: {
        street: facture.entreprise.adresse,
        city: facture.entreprise.ville,
        postalCode: facture.entreprise.code_postal,
        country: 'BE',
      },
      iban: facture.entreprise.iban,
    },

    // Destinataire (client pro)
    customer: {
      name: facture.client.raison_sociale,
      vatNumber: facture.client.tva_numero,
      peppolId: peppolIdDestinataire,
      address: {
        street: facture.client.adresse,
        city: facture.client.ville,
        postalCode: facture.client.code_postal,
        country: facture.client.pays ?? 'BE',
      },
    },

    // Lignes de facture (uniquement type 'produit')
    lines: facture.lignes
      .filter((l) => l.type === 'produit')
      .map((ligne, index) => ({
        lineId: String(index + 1),
        description: ligne.designation,
        quantity: Number(ligne.quantite),
        unitCode: mapUniteToCode(ligne.unite),
        unitPrice: Number(ligne.prix_unitaire_ht),
        discountPercent: Number(ligne.remise_pct ?? 0),
        vatPercent: Number(ligne.taux_tva),
        totalExcludingVat: Number(ligne.total_ht),
      })),

    // Totaux
    totals: {
      totalExcludingVat: Number(facture.total_ht),
      totalVat: Number(facture.total_tva),
      totalIncludingVat: Number(facture.total_ttc),
    },

    // Paiement
    payment: {
      iban: facture.entreprise.iban,
      terms: facture.conditions_paiement ?? 'Comptant',
    },
  }
}

/** Convertit l'unité interne HL vers le code UNECErec20 Peppol */
function mapUniteToCode(unite: string | null): string {
  const map: Record<string, string> = {
    h: 'HUR',        // heure
    j: 'DAY',        // jour
    forfait: 'LS',   // lump sum
    m2: 'MTK',       // mètre carré
    m3: 'MTQ',       // mètre cube
    ml: 'MTR',       // mètre linéaire
    piece: 'C62',    // unité
    lot: 'SET',      // lot
    kg: 'KGM',       // kilogramme
    l: 'LTR',        // litre
    autre: 'C62',    // défaut unité
  }
  return map[unite ?? 'autre'] ?? 'C62'
}
```

---

### 4. Envoi Peppol — `lib/peppol/send.ts`

```typescript
import { einvoiceClient } from './client'
import { mapFactureToEInvoicePayload } from './mapper'
import { checkPeppolCapability } from './discovery'
import { createClient } from '@/lib/supabase/server'

export type PeppolSendResult = {
  success: boolean
  statut: 'envoye' | 'email_fallback' | 'erreur'
  documentId?: string
  erreur?: string
}

export async function envoyerFacturePeppol(
  factureId: string
): Promise<PeppolSendResult> {
  const supabase = createClient()

  // 1. Charger la facture complète
  const { data: facture, error } = await supabase
    .from('factures')
    .select(`
      *,
      client:clients(*),
      entreprise:entreprises(*),
      lignes:factures_lignes(*)
    `)
    .eq('id', factureId)
    .single()

  if (error || !facture) {
    return { success: false, statut: 'erreur', erreur: 'Facture introuvable' }
  }

  // 2. Vérifier éligibilité
  if (facture.client.type !== 'professionnel') {
    return {
      success: false,
      statut: 'erreur',
      erreur: 'Peppol réservé aux clients professionnels',
    }
  }

  if (!facture.client.tva_numero) {
    return {
      success: false,
      statut: 'erreur',
      erreur: 'Numéro de TVA client manquant',
    }
  }

  // 3. Vérifier si le client est sur Peppol
  const { capable, peppolId: peppolIdClient } = await checkPeppolCapability(
    facture.client_id
  )

  const peppolIdEmetteur = facture.entreprise.peppol_id
  if (!peppolIdEmetteur) {
    return {
      success: false,
      statut: 'erreur',
      erreur: 'Peppol ID émetteur non configuré dans les paramètres',
    }
  }

  try {
    let documentId: string
    let statut: 'envoye' | 'email_fallback'

    if (capable && peppolIdClient) {
      // 4a. Envoi via réseau Peppol
      const payload = mapFactureToEInvoicePayload({
        facture,
        peppolIdDestinataire: peppolIdClient,
        peppolIdEmetteur,
      })

      const result = await einvoiceClient.documents.create(payload)
      documentId = result.id
      statut = 'envoye'
    } else {
      // 4b. Fallback email avec pièce jointe UBL
      const payload = mapFactureToEInvoicePayload({
        facture,
        peppolIdDestinataire: '',
        peppolIdEmetteur,
      })

      const result = await einvoiceClient.documents.createWithEmailFallback({
        ...payload,
        fallbackEmail: facture.client.email,
      })
      documentId = result.id
      statut = 'email_fallback'
    }

    // 5. Mettre à jour la base
    await supabase
      .from('factures')
      .update({
        peppol_statut: statut,
        peppol_document_id: documentId,
        peppol_envoye_at: new Date().toISOString(),
        peppol_erreur: null,
      })
      .eq('id', factureId)

    return { success: true, statut, documentId }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'

    await supabase
      .from('factures')
      .update({
        peppol_statut: 'erreur',
        peppol_erreur: message,
      })
      .eq('id', factureId)

    return { success: false, statut: 'erreur', erreur: message }
  }
}
```

---

### 5. API Route — check — `app/api/factures/[id]/peppol-check/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPeppolCapability } from '@/lib/peppol/discovery'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Vérifier auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Récupérer le client_id de la facture
  const { data: facture } = await supabase
    .from('factures')
    .select('client_id')
    .eq('id', params.id)
    .single()

  if (!facture) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

  const result = await checkPeppolCapability(facture.client_id)
  return NextResponse.json(result)
}
```

---

### 6. API Route — envoi — `app/api/factures/[id]/peppol-send/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { envoyerFacturePeppol } from '@/lib/peppol/send'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Vérifier auth + rôle
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!utilisateur || !['super_admin', 'comptable'].includes(utilisateur.role)) {
    return NextResponse.json({ error: 'Permission insuffisante' }, { status: 403 })
  }

  const result = await envoyerFacturePeppol(params.id)

  if (!result.success) {
    return NextResponse.json({ error: result.erreur }, { status: 422 })
  }

  return NextResponse.json(result)
}
```

---

### 7. Webhook e-invoice.be — `app/api/webhooks/einvoice/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * e-invoice.be notifie en POST quand le statut d'un document change.
 * Configurer l'URL dans le dashboard e-invoice.be :
 * https://app.hlrenovation.be/api/webhooks/einvoice
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = createClient()

  const { document_id, status, error_message } = body

  if (!document_id) {
    return NextResponse.json({ error: 'document_id manquant' }, { status: 400 })
  }

  // Mapper le statut e-invoice.be → statut interne
  const statutMap: Record<string, string> = {
    delivered: 'livre',
    failed: 'erreur',
    bounced: 'erreur',
    accepted: 'livre',
  }

  const nouveauStatut = statutMap[status]
  if (!nouveauStatut) {
    // Statut inconnu — on ignore silencieusement
    return NextResponse.json({ ok: true })
  }

  await supabase
    .from('factures')
    .update({
      peppol_statut: nouveauStatut,
      peppol_livre_at: nouveauStatut === 'livre' ? new Date().toISOString() : null,
      peppol_erreur: nouveauStatut === 'erreur' ? (error_message ?? 'Erreur livraison') : null,
    })
    .eq('peppol_document_id', document_id)

  return NextResponse.json({ ok: true })
}
```

---

## 🎨 Composants UI

### Badge statut Peppol — `components/factures/PeppolBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Wifi, WifiOff, Mail, Loader2, AlertCircle } from 'lucide-react'

const STATUTS = {
  non_applicable: { label: 'Particulier', icon: null, variant: 'outline' as const, tooltip: 'Client particulier — Peppol non applicable' },
  en_attente:     { label: 'À envoyer', icon: Loader2, variant: 'secondary' as const, tooltip: 'Facture éligible Peppol, pas encore envoyée' },
  envoye:         { label: 'Peppol envoyé', icon: Wifi, variant: 'default' as const, tooltip: 'Facture transmise via réseau Peppol' },
  livre:          { label: 'Peppol livré', icon: Wifi, variant: 'default' as const, tooltip: 'Livraison confirmée par l\'Access Point destinataire' },
  email_fallback: { label: 'Email UBL', icon: Mail, variant: 'secondary' as const, tooltip: 'Destinataire non Peppol — envoyé par email avec pièce jointe UBL' },
  erreur:         { label: 'Erreur Peppol', icon: AlertCircle, variant: 'destructive' as const, tooltip: 'Échec de livraison Peppol' },
}

export function PeppolBadge({ statut, erreur }: {
  statut: keyof typeof STATUTS
  erreur?: string | null
}) {
  const config = STATUTS[statut] ?? STATUTS.non_applicable
  const Icon = config.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={config.variant} className="gap-1 cursor-help">
          {Icon && <Icon className="h-3 w-3" />}
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{erreur ?? config.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}
```

### Bouton envoi Peppol — `components/factures/PeppolSendButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'

export function PeppolSendButton({ factureId, onSuccess }: {
  factureId: string
  onSuccess?: () => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    setLoading(true)
    try {
      const res = await fetch(`/api/factures/${factureId}/peppol-send`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(`Erreur Peppol : ${data.error}`)
        return
      }

      if (data.statut === 'envoye') {
        toast.success('Facture transmise via Peppol ✓')
      } else if (data.statut === 'email_fallback') {
        toast.info('Client non Peppol — facture envoyée par email avec UBL')
      }

      onSuccess?.()
    } catch {
      toast.error('Erreur de connexion avec e-invoice.be')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSend}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <Send className="h-4 w-4" />
      }
      {loading ? 'Envoi...' : 'Envoyer Peppol'}
    </Button>
  )
}
```

---

## 📐 Intégration dans la page facture existante

Dans `app/(app)/factures/[id]/page.tsx`, ajouter dans la section actions :

```typescript
// Conditions d'affichage du bouton Peppol
const showPeppolButton =
  facture.statut === 'envoyee' &&
  facture.client.type === 'professionnel' &&
  facture.client.tva_numero &&
  !['envoye', 'livre'].includes(facture.peppol_statut ?? '')

// Dans le JSX actions :
{showPeppolButton && (
  <PeppolSendButton
    factureId={facture.id}
    onSuccess={() => router.refresh()}
  />
)}

// Badge statut (toujours visible si client pro)
{facture.client.type === 'professionnel' && (
  <PeppolBadge
    statut={facture.peppol_statut ?? 'non_applicable'}
    erreur={facture.peppol_erreur}
  />
)}
```

---

## 🔐 Sécurité & Permissions

La matrice de permissions existante s'applique :

| Action | super_admin | comptable | utilisateur |
|---|---|---|---|
| Voir badge statut Peppol | ✅ | ✅ | ✅ |
| Vérifier Peppol client | ✅ | ✅ | ❌ |
| Envoyer via Peppol | ✅ | ✅ | ❌ |

Le webhook `/api/webhooks/einvoice` est public (pas d'auth) — c'est normal, il est appelé par e-invoice.be. Il ne fait que des UPDATE ciblés par `peppol_document_id`.

---

## ⚙️ Configuration e-invoice.be (1 seule fois)

1. Créer le compte sur `app.e-invoice.be` avec les données de HL Rénovation
2. Passer le KYC (délai : 48h)
3. Récupérer l'API key → `E_INVOICE_API_KEY` dans `.env.local` et Vercel
4. Récupérer le Legal Entity ID → `E_INVOICE_LEGAL_ENTITY_ID`
5. Configurer le webhook dans le dashboard e-invoice.be :
   - URL : `https://app.hlrenovation.be/api/webhooks/einvoice`
   - Events : `document.delivered`, `document.failed`, `document.bounced`
6. Copier le Peppol ID généré (format `9925:BE...`) → stocker dans `entreprises.peppol_id` via Supabase Dashboard

---

## 🧪 Tests

### Ordre de développement et tests

```bash
# 1. Appliquer la migration
# → Via Supabase Dashboard > SQL Editor > coller 013_peppol.sql

# 2. Installer le package
pnpm add e-invoice-api

# 3. Tester la discovery (sandbox)
# → Créer un script de test temporaire scripts/test-peppol.ts

# 4. Tester l'envoi en sandbox
# → e-invoice.be fournit des Peppol IDs de test dans leur documentation

# 5. Tester le webhook
# → Utiliser https://webhook.site pour intercepter les callbacks
```

### Script de test rapide — `scripts/test-peppol.ts`

```typescript
import EInvoice from 'e-invoice-api'

const client = new EInvoice({
  apiKey: process.env.E_INVOICE_API_KEY!,
  environment: 'development',
})

// Test 1 : Discovery
const discovery = await client.discovery.check({
  peppolId: '9925:BE0123456789', // remplacer par un vrai TVA client
  documentType: 'invoice',
})
console.log('Peppol capable:', discovery.registered)

// Test 2 : Envoi sandbox
const doc = await client.documents.create({
  invoiceNumber: 'TEST-2026-0001',
  // ... payload minimal
})
console.log('Document ID:', doc.id)
```

---

## 📊 Indicateurs Dashboard (optionnel — Phase 2)

Requêtes à ajouter dans le dashboard existant :

```sql
-- Factures en attente d'envoi Peppol
SELECT COUNT(*) FROM factures
WHERE peppol_statut = 'en_attente'
  AND entreprise_id = $1;

-- Taux de livraison Peppol vs email fallback
SELECT
  peppol_statut,
  COUNT(*) as total
FROM factures
WHERE entreprise_id = $1
  AND peppol_statut IS NOT NULL
  AND peppol_statut != 'non_applicable'
GROUP BY peppol_statut;
```

---

## ⏱️ Estimation Charge

| Tâche | Estimation |
|---|---|
| Migration SQL + types Supabase | 1h |
| `lib/peppol/` (client, discovery, send, mapper) | 5h |
| API Routes (check + send + webhook) | 3h |
| Composants UI (badge + bouton) | 2h |
| Intégration page facture | 1h |
| Tests sandbox + validation prod | 3h |
| **Total** | **~15h** |

---

## ✅ Checklist de Livraison

### Onboarding e-invoice.be (avant tout développement)
- [ ] Compte créé sur `app.e-invoice.be` au nom de **HL Rénovation** (pas WAPIX)
- [ ] Services cochés : **Receive Invoices + Send UBL uniquement** (pas de PDF conversion)
- [ ] KYC validé (délai 48h)
- [ ] API key récupérée → `E_INVOICE_API_KEY` dans `.env.local`
- [ ] Legal Entity ID récupéré → `E_INVOICE_LEGAL_ENTITY_ID` dans `.env.local`
- [ ] Peppol ID généré (format `9925:BE...`) → stocké dans `entreprises.peppol_id` via Supabase Dashboard

### MCP Server Claude Code
- [ ] `.mcp.json` configuré avec `E_INVOICE_API_KEY` et `environment: development`
- [ ] `.mcp.json` ajouté au `.gitignore`
- [ ] Test MCP validé dans Claude Code (appel discovery sur un TVA de test)

### Base de données
- [ ] Migration `013_peppol.sql` appliquée en prod Supabase

### Variables Vercel
- [ ] `E_INVOICE_API_KEY` ajoutée dans Vercel Dashboard
- [ ] `E_INVOICE_LEGAL_ENTITY_ID` ajoutée dans Vercel Dashboard

### Développement
- [ ] Webhook configuré dans dashboard e-invoice.be → URL `https://app.hlrenovation.be/api/webhooks/einvoice`
- [ ] Test d'envoi en sandbox validé avec une vraie facture
- [ ] Badge `PeppolBadge` visible sur la page facture
- [ ] Bouton `PeppolSendButton` accessible uniquement aux rôles `super_admin` et `comptable`

### Livraison
- [ ] Commit conventionnel : `feat(peppol): intégration e-invoice.be pour e-invoicing B2B BE`
- [ ] PR `feat/peppol-einvoice` → `develop` créée et reviewée

---

---

*Mars 2026 — WAPIX.be — Initial*
*Avril 2026 — WAPIX.be — **Mise à jour** : pricing confirmé (€0.25 Pro / €0.18 Enterprise), onboarding corrigé (HL Rénovation, pas WAPIX / Send UBL uniquement, pas de PDF conversion), MCP Server Claude Code ajouté*
*Réglementation : Loi belge du 06.02.2024 modifiant le Code TVA — Arrêté Royal du 08.07.2025*
