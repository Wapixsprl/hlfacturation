export type Role = 'super_admin' | 'utilisateur' | 'comptable' | 'ouvrier' | 'equipe' | 'resp_equipe'

export type Resource =
  | 'clients'
  | 'produits'
  | 'devis'
  | 'factures'
  | 'factures_achat'
  | 'tresorerie'
  | 'parametres'
  | 'chantiers'
  | 'planning'
  | 'equipes'

export const PERMISSIONS: Record<Resource, { read: Role[]; write: Role[] }> = {
  clients:        { read: ['super_admin', 'utilisateur', 'comptable'], write: ['super_admin', 'utilisateur'] },
  produits:       { read: ['super_admin', 'utilisateur'],              write: ['super_admin'] },
  devis:          { read: ['super_admin', 'utilisateur', 'comptable'], write: ['super_admin', 'utilisateur'] },
  factures:       { read: ['super_admin', 'comptable'],                write: ['super_admin', 'comptable'] },
  factures_achat: { read: ['super_admin', 'comptable'],                write: ['super_admin', 'comptable'] },
  tresorerie:     { read: ['super_admin', 'comptable'],                write: ['super_admin', 'comptable'] },
  parametres:     { read: ['super_admin'],                             write: ['super_admin'] },
  chantiers:      { read: ['super_admin', 'utilisateur', 'ouvrier', 'resp_equipe'], write: ['super_admin', 'utilisateur', 'resp_equipe'] },
  planning:       { read: ['super_admin', 'utilisateur', 'ouvrier', 'equipe', 'resp_equipe'], write: ['super_admin', 'utilisateur', 'resp_equipe'] },
  equipes:        { read: ['super_admin', 'utilisateur', 'ouvrier', 'equipe', 'resp_equipe'], write: ['super_admin'] },
}

export function canRead(role: Role, resource: Resource): boolean {
  return PERMISSIONS[resource].read.includes(role)
}

export function canWrite(role: Role, resource: Resource): boolean {
  return PERMISSIONS[resource].write.includes(role)
}
