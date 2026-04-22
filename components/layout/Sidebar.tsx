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
    entreprises: { nom: string; logo_url: string | null } | null
  }
  pageAccess?: string[]
}

const allNavigation = [
  { key: 'dashboard',    name: 'Tableau de bord', href: '/dashboard',       icon: LayoutDashboard, roles: null },
  { key: 'clients',      name: 'Clients',          href: '/clients',         icon: Users,           roles: ['super_admin', 'utilisateur', 'comptable'] },
  { key: 'produits',     name: 'Produits',          href: '/produits',        icon: Package,         roles: ['super_admin', 'utilisateur'] },
  { key: 'devis',        name: 'Devis',             href: '/devis',           icon: FileText,        roles: ['super_admin', 'utilisateur', 'comptable'] },
  { key: 'factures',     name: 'Factures',          href: '/factures',        icon: Receipt,         roles: ['super_admin', 'comptable'] },
  { key: 'chantiers',    name: 'Chantiers',         href: '/chantiers',       icon: HardHat,         roles: ['super_admin', 'utilisateur', 'ouvrier', 'resp_equipe'] },
  { key: 'planning',     name: 'Planning',          href: '/planning',        icon: CalendarDays,    roles: ['super_admin', 'utilisateur', 'ouvrier', 'equipe', 'resp_equipe'] },
  { key: 'fournisseurs', name: 'Fournisseurs',      href: '/fournisseurs',    icon: Truck,           roles: ['super_admin', 'utilisateur', 'comptable'] },
  { key: 'achats',       name: 'Achats',            href: '/factures-achat',  icon: ShoppingCart,    roles: ['super_admin', 'comptable'] },
  { key: 'tresorerie',   name: 'Tresorerie',        href: '/tresorerie',      icon: Wallet,          roles: ['super_admin', 'comptable'] },
  { key: 'parametres',   name: 'Parametres',        href: '/parametres',      icon: Settings,        roles: ['super_admin'] },
]

function getNavigation(role: string, pageAccess?: string[]) {
  return allNavigation.filter(item => {
    // Filtre par rôle (logique existante)
    if (item.roles !== null && !item.roles.includes(role)) return false
    // Filtre dynamique pour les non-super_admin (pas de filtre sur 'parametres')
    if (role !== 'super_admin' && pageAccess && item.key !== 'parametres') {
      return pageAccess.includes(item.key)
    }
    return true
  })
}

function SidebarContent({ utilisateur, pageAccess, onNavigate, collapsed = false, onToggle }: SidebarProps & { onNavigate?: () => void; collapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const navigation = getNavigation(utilisateur.role, pageAccess)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const logoUrl = utilisateur.entreprises?.logo_url

  return (
    <TooltipProvider delay={0}>
      <div className="flex flex-col h-full bg-[#1E2028]">
        {/* Logo */}
        <div className={cn(
          "h-[64px] flex items-center border-b border-white/[0.06] transition-all duration-200",
          collapsed ? "px-0 justify-center" : "px-5"
        )}>
          {collapsed ? (
            <div className="w-8 h-8 bg-[#17C2D7] rounded-lg flex items-center justify-center">
              <span className="text-white text-[11px] font-bold tracking-tight">HL</span>
            </div>
          ) : logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={140}
              height={40}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#17C2D7] rounded-lg flex items-center justify-center">
                <span className="text-white text-[11px] font-bold tracking-tight">HL</span>
              </div>
              <div>
                <p className="font-semibold text-[13px] text-white tracking-[-0.01em]">HL Facturation</p>
                <p className="text-[10px] text-[#6B7280] leading-tight">{utilisateur.entreprises?.nom || 'HL Renovation'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 py-4 space-y-0.5 overflow-y-auto transition-all duration-200",
          collapsed ? "px-2" : "px-3"
        )}>
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            const linkElement = (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center rounded-lg text-[13px] font-medium transition-all duration-150',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-[#17C2D7]/10 text-[#17C2D7]'
                    : 'text-[#9CA3AF] hover:bg-white/[0.04] hover:text-white'
                )}
              >
                <item.icon className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                  isActive ? "text-[#17C2D7]" : "text-[#6B7280] group-hover:text-[#9CA3AF]"
                )} />
                {!collapsed && <span className="flex-1">{item.name}</span>}
                {!collapsed && isActive && (
                  <ChevronRight className="h-3.5 w-3.5 text-[#17C2D7]/50" />
                )}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger>
                    {linkElement}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="bg-[#1E2028] text-white border-white/10 text-[12px]">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.href}>{linkElement}</div>
          })}
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
                  <div className="w-8 h-8 bg-[#17C2D7]/15 rounded-full flex items-center justify-center hover:bg-[#DC2626]/20 transition-colors duration-150 group">
                    <span className="text-[#17C2D7] text-[11px] font-semibold group-hover:hidden">
                      {(utilisateur.prenom?.[0] || '').toUpperCase()}{(utilisateur.nom?.[0] || '').toUpperCase()}
                    </span>
                    <LogOut className="h-3.5 w-3.5 text-[#DC2626] hidden group-hover:block" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="bg-[#1E2028] text-white border-white/10 text-[12px]">
                {utilisateur.prenom} {utilisateur.nom} — Se deconnecter
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#17C2D7]/15 rounded-full flex items-center justify-center">
                <span className="text-[#17C2D7] text-[11px] font-semibold">
                  {(utilisateur.prenom?.[0] || '').toUpperCase()}{(utilisateur.nom?.[0] || '').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">
                  {utilisateur.prenom} {utilisateur.nom}
                </p>
                <p className="text-[10px] text-[#6B7280] truncate capitalize">
                  {utilisateur.role?.replace('_', ' ')}
                </p>
              </div>
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
