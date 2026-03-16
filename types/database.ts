// --- Relances config types ---

export interface RelanceEtape {
  jours: number
  enabled: boolean
}

export interface RelanceTypeConfig {
  enabled: boolean
  etapes: RelanceEtape[]
  espacement_minimum_jours: number
  destinataire?: 'fournisseur' // Only for factures_achat
  objet_email?: string // Custom email subject template (supports variables)
  contenu_email?: string // Custom email body text (supports variables)
}

export interface RelancesConfig {
  devis: RelanceTypeConfig
  factures_vente: RelanceTypeConfig
  factures_achat: RelanceTypeConfig
}

export const DEFAULT_RELANCE_EMAILS = {
  devis: {
    objet: 'Rappel — Devis {{numero}} — HL Renovation',
    contenu: `Bonjour {{client}},

Nous nous permettons de vous rappeler que le devis {{numero}} d'un montant de {{montant}} est en attente de votre signature.

Ce devis est valable jusqu'au {{date_validite}}. Passe ce delai, un nouveau devis devra etre etabli.

Si vous avez deja donne suite a ce devis, veuillez ignorer ce rappel.`,
  },
  factures_vente: {
    objet: 'Rappel paiement — Facture {{numero}} — HL Renovation',
    contenu: `Bonjour {{client}},

Sauf erreur de notre part, la facture {{numero}} d'un montant de {{montant}}, arrivee a echeance le {{date_echeance}}, reste impayee a ce jour.

Nous vous prions de bien vouloir proceder au reglement dans les meilleurs delais.

Si votre paiement a deja ete effectue, veuillez ignorer ce rappel.`,
  },
  factures_achat: {
    objet: 'Rappel interne — Facture fournisseur {{numero}} — {{fournisseur}}',
    contenu: `Rappel interne

La facture d'achat {{numero}} du fournisseur {{fournisseur}} d'un montant de {{montant}}, arrivee a echeance le {{date_echeance}}, est en retard de {{jours_retard}} jours.

Merci de proceder au reglement ou de mettre a jour le statut dans l'application.`,
  },
}

export const DEFAULT_RELANCES_CONFIG: RelancesConfig = {
  devis: {
    enabled: true,
    etapes: [
      { jours: 7, enabled: true },
      { jours: 3, enabled: true },
      { jours: 0, enabled: true },
    ],
    espacement_minimum_jours: 7,
    objet_email: DEFAULT_RELANCE_EMAILS.devis.objet,
    contenu_email: DEFAULT_RELANCE_EMAILS.devis.contenu,
  },
  factures_vente: {
    enabled: true,
    etapes: [
      { jours: 7, enabled: true },
      { jours: 15, enabled: true },
      { jours: 30, enabled: true },
    ],
    espacement_minimum_jours: 7,
    objet_email: DEFAULT_RELANCE_EMAILS.factures_vente.objet,
    contenu_email: DEFAULT_RELANCE_EMAILS.factures_vente.contenu,
  },
  factures_achat: {
    enabled: false,
    etapes: [
      { jours: 7, enabled: true },
      { jours: 15, enabled: true },
    ],
    espacement_minimum_jours: 7,
    destinataire: 'fournisseur',
    objet_email: DEFAULT_RELANCE_EMAILS.factures_achat.objet,
    contenu_email: DEFAULT_RELANCE_EMAILS.factures_achat.contenu,
  },
}

export interface Entreprise {
  id: string
  nom: string
  adresse: string | null
  code_postal: string | null
  ville: string | null
  pays: string
  tva_numero: string | null
  iban: string | null
  telephone: string | null
  email: string | null
  logo_url: string | null
  conditions_paiement_defaut: string
  delai_validite_devis_jours: number
  mention_tva_defaut: string | null
  seuil_alerte_tresorerie: number
  prefixe_devis: string
  prefixe_facture: string
  prefixe_avoir: string
  payment_provider: 'none' | 'mollie' | 'stripe'
  payment_enabled: boolean
  mollie_api_key_encrypted: string | null
  stripe_secret_key_encrypted: string | null
  stripe_webhook_secret_encrypted: string | null
  conditions_generales_vente: string | null
  relances_config: RelancesConfig | null
  created_at: string
  updated_at: string
}

export interface Utilisateur {
  id: string
  entreprise_id: string
  nom: string | null
  prenom: string | null
  email: string
  role: 'super_admin' | 'utilisateur' | 'comptable' | 'ouvrier' | 'equipe' | 'resp_equipe'
  actif: boolean
  derniere_connexion: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  entreprise_id: string
  type: 'particulier' | 'professionnel'
  nom: string | null
  prenom: string | null
  raison_sociale: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  pays: string
  email: string | null
  telephone: string | null
  telephone2: string | null
  tva_numero: string | null
  tva_valide: boolean | null
  iban: string | null
  notes: string | null
  // Adresse de facturation
  adresse_facturation: string | null
  code_postal_facturation: string | null
  ville_facturation: string | null
  pays_facturation: string | null
  // Adresse de livraison
  adresse_livraison: string | null
  code_postal_livraison: string | null
  ville_livraison: string | null
  pays_livraison: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface Fournisseur {
  id: string
  entreprise_id: string
  raison_sociale: string
  contact_nom: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  pays: string
  email: string | null
  telephone: string | null
  tva_numero: string | null
  iban: string | null
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface Produit {
  id: string
  entreprise_id: string
  reference: string | null
  designation: string
  description: string | null
  categorie: 'materiaux' | 'main_oeuvre' | 'sous_traitance' | 'equipement' | 'forfait' | 'autre'
  prix_ht: number
  prix_achat_ht: number | null
  taux_tva: number
  unite: 'h' | 'j' | 'forfait' | 'm2' | 'm3' | 'ml' | 'piece' | 'lot' | 'kg' | 'l' | 'autre'
  actif: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AcompteConfig {
  pourcentage: number
  label: string
  date_echeance?: string | null
}

export interface Devis {
  id: string
  entreprise_id: string
  client_id: string
  numero: string
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire' | 'converti'
  titre: string | null
  reference_chantier: string | null
  date_devis: string
  date_validite: string | null
  conditions_paiement: string | null
  acomptes_config: AcompteConfig[]
  introduction: string | null
  conclusion: string | null
  notes_internes: string | null
  total_ht: number
  total_tva: number
  total_ttc: number
  token_signature: string | null
  token_expiration: string | null
  signature_image: string | null
  signature_ip: string | null
  signature_date: string | null
  signature_user_agent: string | null
  pdf_url: string | null
  email_ouvertures: number
  email_derniere_ouverture: string | null
  derniere_relance: string | null
  nb_relances: number
  cgv_acceptees: boolean
  cgv_acceptees_date: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  // Relations
  client?: Client
}

export interface DevisLigne {
  id: string
  devis_id: string
  ordre: number
  type: 'produit' | 'texte' | 'section' | 'saut_page'
  produit_id: string | null
  designation: string | null
  description: string | null
  quantite: number
  unite: string | null
  prix_unitaire_ht: number
  remise_pct: number
  taux_tva: number
  total_ht: number
  created_at: string
  updated_at: string
}

export interface Facture {
  id: string
  entreprise_id: string
  client_id: string
  devis_id: string | null
  numero: string
  type: 'facture' | 'acompte' | 'avoir' | 'situation'
  statut: 'brouillon' | 'envoyee' | 'partiellement_payee' | 'payee' | 'en_retard'
  date_facture: string
  date_echeance: string | null
  mention_tva: string | null
  conditions_paiement: string | null
  total_ht: number
  total_tva: number
  total_ttc: number
  montant_acomptes_deduits: number
  solde_ttc: number
  pdf_url: string | null
  notes_internes: string | null
  email_ouvertures: number
  email_derniere_ouverture: string | null
  derniere_relance: string | null
  nb_relances: number
  nombre_envois: number
  archived_at: string | null
  created_at: string
  updated_at: string
  // Relations
  client?: Client
}

export interface FactureLigne {
  id: string
  facture_id: string
  ordre: number
  type: 'produit' | 'texte' | 'section'
  produit_id: string | null
  designation: string | null
  description: string | null
  quantite: number
  unite: string | null
  prix_unitaire_ht: number
  remise_pct: number
  taux_tva: number
  total_ht: number
  created_at: string
  updated_at: string
}

export interface PaiementClient {
  id: string
  entreprise_id: string
  facture_id: string
  date_paiement: string
  montant: number
  mode: 'virement' | 'cheque' | 'cash' | 'carte' | 'mollie' | 'stripe' | 'autre'
  reference_bancaire: string | null
  notes: string | null
  payment_session_id: string | null
  created_at: string
}

export interface PaymentSession {
  id: string
  entreprise_id: string
  facture_id: string
  provider: 'mollie' | 'stripe'
  provider_payment_id: string | null
  montant: number
  devise: string
  statut: 'created' | 'pending' | 'paid' | 'failed' | 'expired' | 'canceled'
  checkout_url: string | null
  token: string
  token_expiration: string
  ip_address: string | null
  user_agent: string | null
  paid_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface FactureAchat {
  id: string
  entreprise_id: string
  fournisseur_id: string
  devis_id: string | null
  numero_fournisseur: string | null
  statut: 'a_payer' | 'partiellement_paye' | 'paye' | 'en_retard'
  date_facture: string
  designation: string | null
  categorie: 'materiaux' | 'sous_traitance' | 'carburant' | 'assurance' | 'outillage' | 'telecom' | 'autre'
  total_ht: number
  total_tva: number
  total_ttc: number
  fichier_url: string | null
  notes: string | null
  nb_relances: number
  derniere_relance: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  // Relations
  fournisseur?: Fournisseur
}

export interface EcheanceFournisseur {
  id: string
  facture_achat_id: string
  date_echeance: string
  montant: number
  statut: 'a_payer' | 'paye' | 'en_retard'
  date_paiement: string | null
  mode_paiement: 'virement' | 'cheque' | 'cash' | 'autre' | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MouvementTresorerie {
  id: string
  entreprise_id: string
  date_mouvement: string
  libelle: string
  montant: number
  type: 'encaissement_client' | 'paiement_fournisseur' | 'autre_entree' | 'autre_sortie'
  facture_id: string | null
  facture_achat_id: string | null
  rapproche: boolean
  reference_bancaire: string | null
  created_at: string
}

export interface ObjectifCA {
  id: string
  entreprise_id: string
  annee: number
  montant: number
  created_at: string
  updated_at: string
}

// --- Chantiers / Planning ---

export interface Equipe {
  id: string
  entreprise_id: string
  nom: string
  couleur: string
  responsable_id: string | null
  actif: boolean
  created_at: string
  updated_at: string
  // Relations
  responsable?: Utilisateur
  membres?: MembreEquipe[]
}

export interface MembreEquipe {
  id: string
  equipe_id: string
  utilisateur_id: string
  created_at: string
  // Relations
  utilisateur?: Utilisateur
}

export interface Chantier {
  id: string
  entreprise_id: string
  devis_id: string | null
  client_id: string
  numero: string
  titre: string
  description: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  statut: 'a_planifier' | 'planifie' | 'en_cours' | 'termine' | 'livre'
  priorite: 'basse' | 'normale' | 'haute' | 'urgente'
  date_debut: string | null
  date_fin_prevue: string | null
  date_fin_reelle: string | null
  equipe_id: string | null
  budget_ht: number
  cout_reel_ht: number
  notes_internes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  // Relations
  client?: Client
  devis?: Devis
  equipe?: Equipe
}

export interface TacheChantier {
  id: string
  chantier_id: string
  titre: string
  description: string | null
  date_debut: string | null
  date_fin: string | null
  duree_jours: number
  dependance_id: string | null
  equipe_id: string | null
  statut: 'a_faire' | 'en_cours' | 'termine'
  ordre: number
  created_at: string
  updated_at: string
  // Relations
  equipe?: Equipe
}

export interface JournalChantier {
  id: string
  chantier_id: string
  auteur_id: string
  date_entree: string
  type: 'commentaire' | 'photo' | 'incident' | 'livraison_materiel' | 'avancement' | 'reception'
  contenu: string | null
  photos: string[]
  meteo: 'ensoleille' | 'nuageux' | 'pluie' | 'neige' | null
  avancement_pct: number | null
  created_at: string
  updated_at: string
  // Relations
  auteur?: Utilisateur
}

export interface PvReception {
  id: string
  chantier_id: string
  date_reception: string
  observations: string | null
  reserves: { texte: string; resolu: boolean }[]
  photos_avant: string[]
  photos_apres: string[]
  token_signature: string | null
  token_expiration: string | null
  signature_client: string | null
  signature_date: string | null
  signature_ip: string | null
  signature_user_agent: string | null
  pdf_url: string | null
  created_at: string
  updated_at: string
}

export interface SousTraitantChantier {
  id: string
  chantier_id: string
  fournisseur_id: string
  role: string | null
  montant_prevu_ht: number
  created_at: string
  // Relations
  fournisseur?: Fournisseur
}
