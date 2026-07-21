'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  Truck,
  ShoppingCart,
  Wallet,
  Settings,
  Menu,
  LogOut,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  HardHat,
  CalendarDays,
  UserSquare2,
  Clock,
  BookCheck,
  TrendingUp,
  Handshake,
  Zap,
  Wrench,
  ClipboardCheck,
  DoorClosed,
  KeyRound,
  Boxes,
  Warehouse,
  ClipboardList,
  Inbox,
  LifeBuoy,
  Download,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useSidebarState } from '@/lib/hooks/useSidebarState'

interface SidebarProps {
  utilisateur: {
    id: string
    nom: string | null
    prenom: string | null
    email: string
    role: string
    entreprises: { nom: string; logo_url: string | null; favicon_url?: string | null; responsable_prenom?: string | null; responsable_nom?: string | null } | null
  }
  pageAccess?: string[]
}

// Navigation organisée en sections cohérentes (l'ordre du tableau = l'ordre d'affichage).
// `group` rattache chaque entrée à une section (cf. NAV_GROUPS). Les en-têtes de section
// ne s'affichent que si la section contient au moins une entrée visible.
const allNavigation = [
  // — Général —
  { key: 'dashboard',    name: 'Tableau de bord',  href: '/dashboard',       icon: LayoutDashboard, roles: null, group: 'general' },

  // — Ventes —
  { key: 'prospects',    name: 'Prospects',        href: '/prospects',       icon: Inbox,           roles: ['super_admin', 'utilisateur', 'comptable'], group: 'ventes' },
  { key: 'clients',      name: 'Clients',          href: '/clients',         icon: Users,           roles: ['super_admin', 'utilisateur', 'comptable'], group: 'ventes' },
  { key: 'produits',     name: 'Produits',         href: '/produits',        icon: Package,         roles: ['super_admin', 'utilisateur'], group: 'ventes' },
  { key: 'devis',        name: 'Devis',            href: '/devis',           icon: FileText,        roles: ['super_admin', 'utilisateur', 'comptable'], group: 'ventes' },
  { key: 'factures',     name: 'Factures',         href: '/factures',        icon: Receipt,         roles: ['super_admin', 'comptable'], group: 'ventes' },

  // — Terrain (chantiers + module ENTRETIEN opt-in) —
  { key: 'chantiers',    name: 'Chantiers',        href: '/chantiers',       icon: HardHat,         roles: ['super_admin', 'utilisateur', 'ouvrier', 'resp_equipe'], group: 'terrain' },
  { key: 'planning',     name: 'Planning',         href: '/planning',        icon: CalendarDays,    roles: ['super_admin', 'utilisateur', 'ouvrier', 'equipe', 'resp_equipe'], group: 'terrain' },
  { key: 'interventions', name: 'Interventions',   href: '/interventions',   icon: Wrench,          roles: ['super_admin', 'utilisateur', 'ouvrier', 'resp_equipe'], group: 'terrain' },
  { key: 'equipements',  name: 'Équipements',      href: '/equipements',     icon: DoorClosed,      roles: ['super_admin', 'utilisateur', 'resp_equipe'], group: 'terrain' },
  { key: 'checklists',   name: 'Check-lists',      href: '/checklists',      icon: ClipboardCheck,  roles: ['super_admin'], group: 'terrain' },
  { key: 'claviers_code', name: 'Claviers à code', href: '/claviers-code',   icon: KeyRound,        roles: ['super_admin'], group: 'terrain' },

  // — Équipes (RH / temps de travail) —
  { key: 'travailleurs', name: 'Travailleurs',     href: '/travailleurs',    icon: UserSquare2,     roles: ['super_admin', 'resp_equipe', 'comptable'], group: 'equipes' },
  { key: 'presences',    name: 'Présences',        href: '/presences',       icon: Clock,           roles: ['super_admin', 'resp_equipe', 'comptable'], group: 'equipes' },
  { key: 'registre',     name: 'Registre',         href: '/registre',        icon: BookCheck,       roles: ['super_admin', 'comptable', 'resp_equipe'], group: 'equipes' },

  // — Achats & Stock (module Stock opt-in) —
  { key: 'fournisseurs', name: 'Fournisseurs',     href: '/fournisseurs',    icon: Truck,           roles: ['super_admin', 'utilisateur', 'comptable'], group: 'achats' },
  { key: 'sous_traitants', name: 'Sous-traitants', href: '/sous-traitants',  icon: Handshake,       roles: ['super_admin', 'resp_equipe', 'comptable'], group: 'achats' },
  { key: 'achats',       name: 'Achats',           href: '/factures-achat',  icon: ShoppingCart,    roles: ['super_admin', 'comptable'], group: 'achats' },
  { key: 'bons_commande', name: 'Bons de commande', href: '/bons-commande',  icon: ClipboardList,   roles: ['super_admin', 'comptable', 'utilisateur'], group: 'achats' },
  { key: 'stock',        name: 'Stock',            href: '/stock',           icon: Boxes,           roles: ['super_admin', 'utilisateur', 'resp_equipe', 'comptable'], group: 'achats' },
  { key: 'depots',       name: 'Dépôts',           href: '/depots',          icon: Warehouse,       roles: ['super_admin', 'resp_equipe'], group: 'achats' },

  // — Finances —
  { key: 'tresorerie',   name: 'Trésorerie',       href: '/tresorerie',      icon: Wallet,          roles: ['super_admin', 'comptable'], group: 'finances' },
  { key: 'rentabilite',  name: 'Rentabilité',      href: '/rentabilite',     icon: TrendingUp,      roles: ['super_admin', 'comptable'], group: 'finances' },
  { key: 'exports',      name: 'Exports',          href: '/exports',         icon: Download,        roles: ['super_admin', 'comptable'], group: 'finances' },

  // — Système —
  { key: 'support',      name: 'Support',          href: '/support',         icon: LifeBuoy,        roles: ['super_admin', 'utilisateur', 'comptable'], group: 'systeme' },
  { key: 'connect',      name: 'Connect ⚡',       href: '/connect/annuaire', icon: Zap,            roles: ['super_admin', 'utilisateur'], group: 'systeme' },
  { key: 'parametres',   name: 'Paramètres',       href: '/parametres',      icon: Settings,        roles: ['super_admin'], group: 'systeme' },
]

// Sections du menu (ordre + libellé). label = null → pas d'en-tête (haut/bas).
const NAV_GROUPS: { key: string; label: string | null }[] = [
  { key: 'general',  label: null },
  { key: 'ventes',   label: 'Ventes' },
  { key: 'terrain',  label: 'Terrain' },
  { key: 'equipes',  label: 'Équipes' },
  { key: 'achats',   label: 'Achats & Stock' },
  { key: 'finances', label: 'Finances' },
  { key: 'systeme',  label: null },
]

// Modules « opt-in » : groupes ENTRETIEN + STOCK. Jamais affichés tant que la clé n'est pas
// explicitement dans modules_actifs — y compris pour un super_admin sans modules_actifs (legacy NULL).
const OPT_IN_KEYS = new Set(['interventions', 'checklists', 'equipements', 'claviers_code', 'stock', 'depots', 'bons_commande'])

function getNavigation(role: string, pageAccess?: string[]) {
  return allNavigation.filter(item => {
    // Groupe opt-in (ENTRETIEN) : visible UNIQUEMENT si activé explicitement
    if (OPT_IN_KEYS.has(item.key)) {
      if (!pageAccess || !pageAccess.includes(item.key)) return false
      return role === 'super_admin' || item.roles === null || item.roles.includes(role)
    }
    // Fonctionnalités cœur toujours visibles selon le rôle, hors gate modules_actifs
    // (clés 'prospects'/'support' absentes des modules_actifs historiques des tenants).
    if (item.key === 'prospects' || item.key === 'support') {
      return role === 'super_admin' || item.roles === null || (item.roles?.includes(role) ?? false)
    }
    if (role === 'super_admin') {
      // Paramètres toujours visible pour super_admin (Audit = module opt-in activable par l'admin)
      if (item.key === 'parametres') return true
      // Si modules_actifs fourni par le layout → le respecter
      if (pageAccess) return pageAccess.includes(item.key)
      // Sinon tout afficher (legacy)
      return true
    }
    if (item.key === 'parametres') return false
    // pageAccess (DB) est la source de vérité pour tous les rôles non-super_admin
    if (pageAccess) return pageAccess.includes(item.key)
    // Fallback sur les rôles hardcodés si pageAccess non encore chargé
    return item.roles === null || item.roles.includes(role)
  })
}

function SidebarContent({ utilisateur, pageAccess, onNavigate, collapsed = false, onToggle }: SidebarProps & { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const navigation = getNavigation(utilisateur.role, pageAccess)
  // Regroupe les entrées visibles par section ; on ignore les sections vides
  // (ex. modules opt-in désactivés) pour ne pas afficher d'en-tête orphelin.
  const groupedNav = NAV_GROUPS
    .map((g) => ({ ...g, items: navigation.filter((i) => i.group === g.key) }))
    .filter((g) => g.items.length > 0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const logoUrl = utilisateur.entreprises?.logo_url
  const faviconUrl = utilisateur.entreprises?.favicon_url
  const entrepriseNom = utilisateur.entreprises?.nom || 'Facturation'
  // super_admin → Paramètres ; sinon → page perso "Mon compte"
  const accountHref = utilisateur.role === 'super_admin' ? '/parametres' : '/mon-compte'
  // Nom affiché : pour le super_admin (gérant) on prend le responsable défini
  // dans les paramètres (dynamique), sinon le nom du compte.
  const ent = utilisateur.entreprises
  const useResp = utilisateur.role === 'super_admin' && (ent?.responsable_prenom || ent?.responsable_nom)
  const displayPrenom = useResp ? (ent?.responsable_prenom ?? '') : (utilisateur.prenom ?? '')
  const displayNom = useResp ? (ent?.responsable_nom ?? '') : (utilisateur.nom ?? '')
  const displayFull = [displayPrenom, displayNom].filter(Boolean).join(' ') || 'Utilisateur'
  const displayInitials = `${(displayPrenom[0] ?? '').toUpperCase()}${(displayNom[0] ?? '').toUpperCase()}` || 'U'
  // Initiales (max 2 caractères) pour le badge replié / fallback sans logo
  const initiales = entrepriseNom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || 'FA'

  return (
    <TooltipProvider delay={0}>
      <div className="flex flex-col h-full bg-[#0B0B0D]">
        {/* Logo */}
        <div className={cn(
          "h-[64px] flex items-center border-b border-white/[0.06] transition-all duration-200",
          collapsed ? "px-0 justify-center" : "px-5"
        )}>
          {collapsed ? (
            faviconUrl ? (
              <Image
                src={faviconUrl}
                alt={entrepriseNom}
                width={32}
                height={32}
                className="h-8 w-8 object-contain rounded-md"
              />
            ) : (
              <div className="w-8 h-8 bg-[#F5B400] rounded-lg flex items-center justify-center">
                <span className="text-[#0A0A0B] text-[11px] font-bold tracking-tight">{initiales}</span>
              </div>
            )
          ) : logoUrl ? (
            <Image
              src={logoUrl}
              alt={entrepriseNom}
              width={140}
              height={40}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#F5B400] rounded-lg flex items-center justify-center">
                <span className="text-[#0A0A0B] text-[11px] font-bold tracking-tight">{initiales}</span>
              </div>
              <div>
                <p className="font-semibold text-[13px] text-white tracking-[-0.01em]">{entrepriseNom}</p>
                <p className="text-[10px] text-[#6B7280] leading-tight">Facturation</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 py-4 space-y-0.5 overflow-y-auto transition-all duration-200",
          collapsed ? "px-2" : "px-3"
        )}>
          {(() => {
          let runningIdx = 0
          return groupedNav.map((group) => (
            <div key={group.key} className={group.key !== 'general' ? 'pt-3' : ''}>
              {group.label && !collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]/60 select-none">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && (
                <div className="mx-2 mb-1.5 border-t border-white/[0.06]" />
              )}
              <div className="space-y-0.5">
          {group.items.map((item) => {
            const idx = runningIdx++
            // Connect garde un menu surligné sur tous ses sous-onglets (/connect/*)
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/') ||
              (item.key === 'connect' && pathname.startsWith('/connect/'))

            const linkElement = (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 ease-out',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-[#F5B400]/10 text-[#F5B400] shadow-[inset_0_0_0_1px_rgba(245,180,0,0.12)]'
                    : 'text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white hover:translate-x-0.5'
                )}
              >
                {/* Indicateur vertical jaune animé */}
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-[#F5B400] rounded-r-full animate-scale-in" />
                )}
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-all duration-200",
                  isActive
                    ? "text-[#F5B400] drop-shadow-[0_0_6px_rgba(245,180,0,0.5)]"
                    : "text-[#6B7280] group-hover:text-[#F5B400] group-hover:scale-110"
                )} />
                {!collapsed && <span className="flex-1">{item.name}</span>}
                {!collapsed && isActive && (
                  <ChevronRight className="h-3.5 w-3.5 text-[#F5B400]/60 animate-slide-in-right" />
                )}
              </Link>
            )

            const wrappedItem = (
              <div
                key={item.href}
                className="animate-slide-in-right"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {linkElement}
              </div>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger className="block w-full bg-transparent border-0 p-0 cursor-pointer">
                    {wrappedItem}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="bg-[#0B0B0D] text-white border-white/10 text-[12px]">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return wrappedItem
          })}
              </div>
            </div>
          ))
          })()}
        </nav>

        {/* Collapse toggle button (desktop only) */}
        {onToggle && (
          <div className={cn("pb-2", collapsed ? "px-2" : "px-3")}>
            <button
              onClick={onToggle}
              className={cn(
                "flex items-center w-full rounded-lg py-2 text-[#6B7280] hover:text-white hover:bg-white/[0.04] transition-all duration-150",
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              )}
              title={collapsed ? "Deployer le menu" : "Replier le menu"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              ) : (
                <>
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                  <span className="text-[12px] font-medium">Replier</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* User footer */}
        <div className={cn(
          "border-t border-white/[0.06] p-4 mb-2 transition-all duration-200",
          collapsed ? "mx-1 px-1" : "mx-3"
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger>
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center"
                  title="Se deconnecter"
                >
                  <div className="w-8 h-8 bg-[#F5B400]/15 rounded-full flex items-center justify-center hover:bg-[#DC2626]/20 transition-colors duration-150 group">
                    <span className="text-[#F5B400] text-[11px] font-semibold group-hover:hidden">
                      {displayInitials}
                    </span>
                    <LogOut className="h-3.5 w-3.5 text-[#DC2626] hidden group-hover:block" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="bg-[#0B0B0D] text-white border-white/10 text-[12px]">
                {displayFull} — Se deconnecter
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href={accountHref}
                onClick={onNavigate}
                title={utilisateur.role === 'super_admin' ? 'Paramètres' : 'Mon compte'}
                className="flex items-center gap-2.5 flex-1 min-w-0 rounded-lg p-1 -m-1 hover:bg-white/[0.06] transition-colors duration-150 group"
              >
                <div className="w-8 h-8 bg-[#F5B400]/15 rounded-full flex items-center justify-center group-hover:bg-[#F5B400]/25 transition-colors shrink-0">
                  <span className="text-[#F5B400] text-[11px] font-semibold">
                    {displayInitials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate group-hover:text-[#F5B400] transition-colors">
                    {displayFull}
                  </p>
                  <p className="text-[10px] text-[#6B7280] truncate">
                    {utilisateur.email}
                  </p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-[#6B7280] hover:text-white hover:bg-white/[0.06] rounded-lg"
                onClick={handleLogout}
                title="Se deconnecter"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export function Sidebar({ utilisateur, pageAccess }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { collapsed, toggle } = useSidebarState()

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-200 z-30",
        collapsed ? "lg:w-[64px]" : "lg:w-[240px]"
      )}>
        <SidebarContent utilisateur={utilisateur} pageAccess={pageAccess} collapsed={collapsed} onToggle={toggle} />
      </div>

      {/* Mobile hamburger button */}
      <div className="lg:hidden fixed top-0 left-0 z-40 p-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white h-9 w-9 hover:bg-[#F9FAFB] transition-colors duration-150 shadow-sm">
            <Menu className="h-5 w-5 text-[#374151]" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[240px] border-r-0">
            <SidebarContent utilisateur={utilisateur} pageAccess={pageAccess} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
