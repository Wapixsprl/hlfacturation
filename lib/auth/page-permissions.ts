export const MANAGED_PAGES = [
  { key: 'dashboard',    label: 'Tableau de bord' },
  { key: 'clients',      label: 'Clients' },
  { key: 'produits',     label: 'Produits' },
  { key: 'devis',        label: 'Devis' },
  { key: 'factures',     label: 'Factures' },
  { key: 'chantiers',    label: 'Chantiers' },
  { key: 'planning',     label: 'Planning' },
  { key: 'fournisseurs', label: 'Fournisseurs' },
  { key: 'achats',       label: 'Achats' },
  { key: 'tresorerie',   label: 'Trésorerie' },
] as const

export type PageKey = typeof MANAGED_PAGES[number]['key']

export const MANAGED_ROLES = [
  { key: 'utilisateur',  label: 'Utilisateur' },
  { key: 'comptable',    label: 'Comptable' },
  { key: 'resp_equipe',  label: 'Resp. Équipe' },
  { key: 'equipe',       label: 'Équipe' },
  { key: 'ouvrier',      label: 'Ouvrier' },
] as const

export type RoleKey = typeof MANAGED_ROLES[number]['key']

// Valeurs par défaut — miroir de la config Sidebar hardcodée
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  utilisateur:  { dashboard: true,  clients: true,  produits: true,  devis: true,  factures: false, chantiers: true,  planning: true,  fournisseurs: true,  achats: false, tresorerie: false },
  comptable:    { dashboard: true,  clients: true,  produits: false, devis: true,  factures: true,  chantiers: false, planning: false, fournisseurs: true,  achats: true,  tresorerie: true  },
  ouvrier:      { dashboard: true,  clients: false, produits: false, devis: false, factures: false, chantiers: true,  planning: true,  fournisseurs: false, achats: false, tresorerie: false },
  equipe:       { dashboard: true,  clients: false, produits: false, devis: false, factures: false, chantiers: false, planning: true,  fournisseurs: false, achats: false, tresorerie: false },
  resp_equipe:  { dashboard: true,  clients: false, produits: false, devis: false, factures: false, chantiers: true,  planning: true,  fournisseurs: false, achats: false, tresorerie: false },
}
