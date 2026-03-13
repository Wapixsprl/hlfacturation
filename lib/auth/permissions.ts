export type Role = 'super_admin' | 'utilisateur' | 'comptable'

export type Resource =
  | 'clients'
  | 'produits'
  | 'devis'
  | 'factures'
  | 'factures_achat'
  | 'tresorerie'
  | 'parametres'

export const PERMISSIONS: Record<Resource, { read: Role[]; write: Role[] }> = {
  clients:        { read: ['super_admin', 'utilisateur', 'comptable'], write: ['super_admin', 'utilisateur'] },
  produits:       { read: ['super_admin', 'utilisateur'],              write: ['super_admin'] },
  devis:          { read: ['super_admin', 'utilisateur', 'comptable'], write: ['super_admin', 'utilisateur'] },
  factures:       { read: ['super_admin', 'comptable'],                write: ['super_admin', 'comptable'] },
  factures_achat: { read: ['super_admin', 'comptable'],                write: ['super_admin', 'comptable'] },
  tresorerie:     { read: ['super_admin', 'comptable'],                write: ['super_admin', 'comptable'] },
  parametres:     { read: ['super_admin'],                             write: ['super_admin'] },
}

export function canRead(role: Role, resource: Resource): boolean {
  return PERMISSIONS[resource].read.includes(role)
}

export function canWrite(role: Role, resource: Resource): boolean {
  return PERMISSIONS[resource].write.includes(role)
}
