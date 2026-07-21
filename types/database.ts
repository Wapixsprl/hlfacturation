// --- Relances config types ---

export interface RelanceEtape {
  jours: number
  enabled: boolean
  objet_email?: string   // Sujet propre à cette étape (variables supportées)
  contenu_email?: string // Corps propre à cette étape (variables supportées)
}

export interface RelanceTypeConfig {
  enabled: boolean
  etapes: RelanceEtape[]
  espacement_minimum_jours: number
  destinataire?: 'fournisseur' // Only for factures_achat
  // Fallback global (rétro-compat) si une étape n'a pas son propre contenu
  objet_email?: string
  contenu_email?: string
}

export interface RelancesConfig {
  devis: RelanceTypeConfig
  factures_vente: RelanceTypeConfig
  factures_achat: RelanceTypeConfig
}

export const DEFAULT_RELANCE_EMAILS = {
  devis: {
    objet: 'Rappel — Devis {{numero}} — {{entreprise}}',
    contenu: `Bonjour {{client}},

Nous nous permettons de vous rappeler que le devis {{numero}} d'un montant de {{montant}} est en attente de votre signature.

Ce devis est valable jusqu'au {{date_validite}}. Passe ce delai, un nouveau devis devra etre etabli.

Si vous avez deja donne suite a ce devis, veuillez ignorer ce rappel.`,
  },
  factures_vente: {
    objet: 'Rappel paiement — Facture {{numero}} — {{entreprise}}',
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
      { jours: 7, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.devis.objet, contenu_email: DEFAULT_RELANCE_EMAILS.devis.contenu },
      { jours: 3, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.devis.objet, contenu_email: DEFAULT_RELANCE_EMAILS.devis.contenu },
      { jours: 0, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.devis.objet, contenu_email: DEFAULT_RELANCE_EMAILS.devis.contenu },
    ],
    espacement_minimum_jours: 7,
    objet_email: DEFAULT_RELANCE_EMAILS.devis.objet,
    contenu_email: DEFAULT_RELANCE_EMAILS.devis.contenu,
  },
  factures_vente: {
    enabled: true,
    etapes: [
      { jours: 7, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.factures_vente.objet, contenu_email: DEFAULT_RELANCE_EMAILS.factures_vente.contenu },
      { jours: 15, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.factures_vente.objet, contenu_email: DEFAULT_RELANCE_EMAILS.factures_vente.contenu },
      { jours: 30, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.factures_vente.objet, contenu_email: DEFAULT_RELANCE_EMAILS.factures_vente.contenu },
    ],
    espacement_minimum_jours: 7,
    objet_email: DEFAULT_RELANCE_EMAILS.factures_vente.objet,
    contenu_email: DEFAULT_RELANCE_EMAILS.factures_vente.contenu,
  },
  factures_achat: {
    enabled: false,
    etapes: [
      { jours: 7, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.factures_achat.objet, contenu_email: DEFAULT_RELANCE_EMAILS.factures_achat.contenu },
      { jours: 15, enabled: true, objet_email: DEFAULT_RELANCE_EMAILS.factures_achat.objet, contenu_email: DEFAULT_RELANCE_EMAILS.factures_achat.contenu },
    ],
    espacement_minimum_jours: 7,
    destinataire: 'fournisseur',
    objet_email: DEFAULT_RELANCE_EMAILS.factures_achat.objet,
    contenu_email: DEFAULT_RELANCE_EMAILS.factures_achat.contenu,
  },
}

/**
 * Config relances « tout désactivé ». Défaut des NOUVELLES instances : livrées
 * silencieuses (aucune relance ne part tant que l'équipe ne les active pas au
 * setup). Conserve les étapes/templates pour activation ultérieure en 1 clic.
 */
export const DISABLED_RELANCES_CONFIG: RelancesConfig = {
  devis:          { ...DEFAULT_RELANCES_CONFIG.devis,          enabled: false },
  factures_vente: { ...DEFAULT_RELANCES_CONFIG.factures_vente, enabled: false },
  factures_achat: { ...DEFAULT_RELANCES_CONFIG.factures_achat, enabled: false },
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
  favicon_url: string | null
  responsable_prenom: string | null
  responsable_nom: string | null
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
  copie_email: string | null
  einvoice_api_key_encrypted: string | null
  einvoice_peppol_id: string | null
  einvoice_test_mode: boolean
  einvoice_webhook_secret_encrypted: string | null
  // Connexion de secours pointage (migration 051)
  pointage_token?: string | null
  // Abonnement SaaS (migration 053)
  subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | 'exempt' | 'suspended'
  trial_ends_at?: string | null
  plan?: 'mensuel' | 'annuel' | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  current_period_end?: string | null
  // Domaine personnalisé / white-label (migration 055)
  custom_domain?: string | null
  custom_domain_status?: 'pending' | 'active'
  // Thème couleurs (migration 062)
  couleur_primaire?: string | null
  couleur_secondaire?: string | null
  // WAPIX Connect (migration 063)
  type_abonnement?: 'wapixbtp_complet' | 'connect' | 'free_claim'
  created_at: string
  updated_at: string
}

// ─── WAPIX Connect (migration 063) ────────────────────────────────────────────

export interface ConnectProfilPublic {
  id: string
  entreprise_id: string
  // Métiers et zone
  metier_principal: string
  metiers_secondaires: string[]
  zone_intervention_type: 'rayon' | 'codes_postaux'
  zone_rayon_km: number | null
  zone_codes_postaux: string[] | null
  // Présentation
  description_courte: string | null
  description_longue: string | null
  savoir_faire: string[] | null
  // Médias
  logo_url: string | null
  galerie_photos: { url: string; legende?: string }[]
  video_url: string | null
  // Crédibilité
  annee_creation: number | null
  taille_equipe: number | null
  assurance_decennale_compagnie: string | null
  assurance_decennale_numero: string | null
  certifications: { nom: string; date_obtention?: string; validite?: string }[]
  labels: string[] | null
  // Disponibilité
  statut_disponibilite: 'disponible' | 'partiellement' | 'complet'
  delai_reponse_moyen_h: number | null
  // Tarification
  tarif_horaire_min: number | null
  tarif_horaire_max: number | null
  tarif_forfait_indicatif: string | null
  // Références
  references_chantiers: { titre: string; description?: string; photos?: string[] }[]
  // Modération
  moderation_pending: boolean
  // Calculés
  score_completude: number
  taux_reponse_pct: number
  derniere_activite: string | null
  derniere_proposition_recue: string | null
  derniere_proposition_acceptee: string | null
  created_at: string
  updated_at: string
}

export interface ConnectParametre {
  cle: string
  valeur: unknown
  type_valeur: 'integer' | 'decimal' | 'boolean' | 'string' | 'json'
  description: string
  categorie: 'tarification' | 'matching' | 'antispam' | 'antiscraping' | 'general'
  modifie_par: string | null
  modifie_le: string
}

export interface ConnectParametreHistorique {
  id: string
  cle: string
  ancienne_valeur: unknown
  nouvelle_valeur: unknown
  modifie_par: string | null
  motif: string | null
  modifie_le: string
}

export type ConnectPropositionStatut = 'en_attente' | 'acceptee' | 'refusee' | 'expiree'
export type ConnectCibleType = 'sous_traitant_carnet' | 'profil_connect' | 'profil_wapixbtp_complet'

export interface ConnectProposition {
  id: string
  entreprise_demandeur_id: string
  chantier_id: string | null
  cible_type: ConnectCibleType
  cible_entreprise_id: string | null
  cible_sous_traitant_id: string | null
  metier: string
  zone: string
  date_souhaitee_debut: string | null
  date_souhaitee_fin: string | null
  duree_estimee_jours: number | null
  description: string
  budget_indicatif: number | null
  photos: string[]
  statut: ConnectPropositionStatut
  repondu_le: string | null
  motif_refus: string | null
  created_at: string
  expire_le: string
}

export interface ConnectPropositionThread {
  id: string
  proposition_id: string
  auteur_entreprise_id: string
  contenu: string
  attachements: unknown[]
  created_at: string
}

/** Résultat de la RPC connect_pile_propositions */
export interface ConnectCandidatPile {
  priorite: 1 | 2 | 3
  entreprise_id: string | null
  sous_traitant_id: string | null
  nom: string
  metier_principal: string
  metiers_secondaires: string[] | null
  zone_rayon_km: number | null
  zone_codes_postaux: string[] | null
  taille_equipe: number | null
  tarif_horaire_min: number | null
  tarif_horaire_max: number | null
  note_interne: number | null
  nb_interventions: number
  statut_disponibilite: 'disponible' | 'partiellement' | 'complet'
  score_completude: number | null
  taux_reponse_pct: number
  description_courte: string | null
  logo_url: string | null
  cover_photo_url: string | null
  source: 'carnet_prive' | 'connect' | 'wapixbtp_complet'
  deja_propose: boolean
}

export interface ConnectAbonnement {
  id: string
  entreprise_id: string
  latence_demarree_le: string
  latence_jusqu_au: string
  latence_extension_vip_jusqu_au: string | null
  latence_extension_motif: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  statut_stripe: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired' | null
  prochain_prelevement_le: string | null
  statut: 'latence' | 'actif_payant' | 'en_arret' | 'resilie'
  geste_propose_le: string | null
  geste_accepte_le: string | null
  geste_extension_mois: number
  total_propositions_recues: number
  total_propositions_acceptees: number
  total_chantiers_obtenus: number
  email_preavis_envoye_le: string | null
  email_geste_envoye_le: string | null
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
  is_platform_admin?: boolean
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
  // Peppol
  peppol_id: string | null
  peppol_id_verifie: boolean | null
  // Blacklist relances : si true, aucune relance auto ne sera envoyee a ce client
  exempt_relances: boolean
  exempt_relances_motif: string | null
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
  peppol_id: string | null
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
  unite: 'h' | 'j' | 'forfait' | 'm2' | 'm3' | 'ml' | 'km' | 'piece' | 'lot' | 'kg' | 'l' | 'autre'
  actif: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface PieceJointe {
  name: string
  file_path: string
  signed_url: string
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
  adresse_chantier: string | null
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
  remise_globale_type: 'pct' | 'montant'
  remise_globale_pct: number
  remise_globale_montant: number
  remise_globale_libelle: string | null
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
  pieces_jointes: PieceJointe[] | null
  // Suivi exécution / avenants (migration 070)
  chantier_id: string | null
  devis_parent_id: string | null
  numero_avenant: number | null
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
  remise_type: 'pct' | 'montant'
  remise_pct: number
  remise_montant: number
  taux_tva: number
  total_ht: number
  is_option: boolean
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
  remise_globale_type: 'pct' | 'montant'
  remise_globale_pct: number
  remise_globale_montant: number
  remise_globale_libelle: string | null
  acompte_pct: number | null
  acompte_numero: number | null
  montant_acomptes_deduits: number
  solde_ttc: number
  pdf_url: string | null
  notes_internes: string | null
  email_ouvertures: number
  email_derniere_ouverture: string | null
  derniere_relance: string | null
  nb_relances: number
  nombre_envois: number
  pieces_jointes: PieceJointe[] | null
  // Peppol
  peppol_document_id: string | null
  peppol_statut: 'non_envoye' | 'envoye' | 'recu' | 'echec' | 'non_inscrit' | null
  peppol_recipient_id: string | null
  peppol_sent_at: string | null
  peppol_error: string | null
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
  remise_type: 'pct' | 'montant'
  remise_pct: number
  remise_montant: number
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
  type: 'facture' | 'note_credit'
  facture_origine_id: string | null
  peppol_document_id: string | null
  peppol_received_at: string | null
  peppol_source: 'manual' | 'peppol'
  statut: 'a_payer' | 'partiellement_paye' | 'paye' | 'en_retard'
  date_facture: string
  designation: string | null
  categorie: 'materiaux' | 'sous_traitance' | 'carburant' | 'assurance' | 'outillage' | 'telecom' | 'autre'
  total_ht: number
  total_tva: number
  total_ttc: number
  remise_type: 'pct' | 'montant'
  remise_pct: number
  remise_montant: number
  remise_libelle: string | null
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

export interface ClientAdresse {
  id: string
  entreprise_id: string
  client_id: string
  libelle: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  created_at: string
}

export interface DemandeAvis {
  id: string
  entreprise_id: string
  client_id: string | null
  source_type: 'chantier' | 'intervention' | 'facture' | 'manuel'
  source_id: string | null
  canal: 'email' | 'sms'
  destinataire: string | null
  statut: 'planifie' | 'envoye' | 'clique' | 'converti' | 'desinscrit' | 'echec'
  token: string | null
  planifie_pour: string
  envoye_at: string | null
  clique_at: string | null
  relance_envoyee: boolean
  erreur: string | null
  created_at: string
  updated_at: string
}

// Config Avis Google (colonnes avis_* ajoutées à entreprises par la migration 103).
// Accédées par cast sur Entreprise (cf. ParametresPageContent / FacturationTab).
export interface AvisGoogleConfig {
  avis_google_actif: boolean
  avis_google_url: string | null
  avis_google_place_id: string | null
  avis_canal_email: boolean
  avis_canal_sms: boolean
  avis_delai_heures: number
  avis_relance_jours: number
  avis_sur_chantier: boolean
  avis_sur_intervention: boolean
  avis_sur_facture: boolean
  avis_message_email_sujet: string | null
  avis_message_email_corps: string | null
  avis_message_sms: string | null
}

export type ProspectStatut = 'nouveau' | 'contacte' | 'qualifie' | 'devis' | 'gagne' | 'perdu'

export interface Prospect {
  id: string
  entreprise_id: string
  nom: string | null
  email: string | null
  telephone: string | null
  message: string | null
  source: string | null
  url_site: string | null
  ip: string | null
  statut: ProspectStatut
  lu: boolean
  client_id: string | null
  devis_id: string | null
  facture_id: string | null
  token: string | null
  created_at: string
  updated_at: string
}

// Config formulaire Prospect (colonnes prospect_* ajoutées à entreprises par la migration 104).
export interface ProspectFormConfig {
  prospect_form_cle: string | null
  prospect_form_actif: boolean
  prospect_origines: string[] | null
  prospect_notif_email: string | null
}

export type TicketStatut = 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'ferme'
export type TicketPriorite = 'basse' | 'normale' | 'haute' | 'urgente'

export interface Ticket {
  id: string
  entreprise_id: string
  sujet: string | null
  demandeur_nom: string | null
  demandeur_email: string | null
  demandeur_telephone: string | null
  priorite: TicketPriorite
  statut: TicketStatut
  lu: boolean
  source: string | null
  url_site: string | null
  ip: string | null
  client_id: string | null
  assigne_a: string | null
  token: string | null
  created_at: string
  updated_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  entreprise_id: string
  auteur: 'client' | 'agent' | 'note'
  corps: string
  created_at: string
}

// Config formulaire Support (colonnes support_* ajoutées à entreprises par la migration 106).
export interface SupportFormConfig {
  support_form_cle: string | null
  support_form_actif: boolean
  support_notif_email: string | null
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
  budget_heures?: number | null
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

// ============================================================
// Module Pointage 2027 — CDC-POINTAGE-2027.md §4.1
// ============================================================

export type TypeContrat =
  | 'cdi' | 'cdd' | 'interim' | 'independant' | 'sous_traitant' | 'etudiant' | 'apprenti'

export type LangueOuvrier = 'fr' | 'nl' | 'en' | 'ro' | 'pl' | 'pt'

export interface Travailleur {
  id: string
  entreprise_id: string
  utilisateur_id: string | null
  equipe_id: string | null
  // Identité
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  niss: string | null
  date_naissance: string | null
  // Contrat
  date_entree: string | null
  date_sortie: string | null
  type_contrat: TypeContrat
  employeur_bce: string | null
  cp_paritaire: string
  taux_horaire: number | null
  // Auth ouvrier
  pin_hash: string | null
  qr_token: string | null
  langue: LangueOuvrier
  // RGPD
  geoloc_opt_in: boolean
  // Méta
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type TypeEvenementPointage = 'arrivee' | 'depart' | 'pause_debut' | 'pause_fin'
export type MethodePointage = 'qr' | 'nfc' | 'geoloc' | 'declaratif' | 'chef' | 'api'
export type CiawStatus = 'not_required' | 'pending' | 'sent' | 'ok' | 'error'

export interface Pointage {
  id: string
  entreprise_id: string
  travailleur_id: string
  chantier_id: string | null
  // Événement
  type_evenement: TypeEvenementPointage
  horodatage_client: string | null
  horodatage_serveur: string
  methode: MethodePointage
  // Géoloc
  geo_lat: number | null
  geo_lng: number | null
  geo_accuracy_m: number | null
  // Traçabilité
  device_id: string | null
  user_agent: string | null
  ip_address: string | null
  saisi_par: string | null
  motif_saisie: string | null
  // CIAW
  ciaw_message_id: string | null
  ciaw_status: CiawStatus
  ciaw_response: Record<string, unknown> | null
  ciaw_sent_at: string | null
  ciaw_retry_count: number
  ciaw_next_retry_at: string | null
  // Audit log immuable
  audit_log: PointageAuditEntry[]
  // Append-only + hash chaîné (migration 050)
  correction_de: string | null   // référence le pointage corrigé/annulé (null = original)
  annule: boolean                 // true = enregistrement d'annulation
  hash: string | null             // SHA-256 chaîné
  hash_precedent: string | null   // hash du maillon précédent (chaîne par entreprise)
  verrouille: boolean             // figé suite à validation hebdomadaire
  verrouille_le: string | null
  created_at: string
  updated_at: string
}

export interface PointageAuditEntry {
  at: string
  by: string | null
  before: Partial<Pointage>
  after: Partial<Pointage>
}

export interface RegistreValide {
  id: string
  entreprise_id: string
  travailleur_id: string
  semaine_iso: string             // "2027-W03"
  date_debut: string              // Lundi YYYY-MM-DD
  date_fin: string                // Dimanche YYYY-MM-DD
  total_heures: number
  total_pauses_min: number
  total_jours: number
  details_json: RegistreDetailJour[]
  anomalies_json: AnomaliePointage[]
  hash_sha256: string
  validé_par: string
  validé_le: string
  pdf_url: string | null
  pdf_generated_at: string | null
}

export interface RegistreDetailJour {
  jour: string
  arrivee: string | null
  depart: string | null
  pauses: { debut: string; fin: string; duree_min: number }[]
  total_heures: number
  total_pauses_min: number
  chantiers: string[]
  anomalies: AnomaliePointage[]
}

export interface AnomaliePointage {
  code:
    | 'missing_arrivee'
    | 'missing_depart'
    | 'missing_pause'
    | 'depassement_horaire'
    | 'pause_orpheline'
    | 'geo_aberrant'
    | 'travail_nuit'
  severity: 'info' | 'warning' | 'error'
  message: string
}

// Réponse de la RPC etat_pointage_actuel (pour l'app ouvrier)
export interface EtatPointageActuel {
  travailleur_id: string
  jour: string
  arrivee: string | null
  depart: string | null
  pauses: { debut: string; fin: string; duree_min: number }[]
  total_heures: number
  total_pauses_min: number
  chantiers: string[]
  evenements: { id: string; type: TypeEvenementPointage; at: string; chantier_id: string | null; methode: MethodePointage; saisi_par: string | null }[]
  anomalies: AnomaliePointage[]
  journee_complete: boolean
  en_cours: boolean
  en_pause: boolean
  // Calculé côté RPC
  etat: 'non_arrive' | 'en_cours' | 'en_pause' | 'termine'
  chantier_nom: string | null
  chantier_ville: string | null
  now: string
}
