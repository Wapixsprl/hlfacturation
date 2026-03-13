'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  utilisateur: {
    id: string
    nom: string | null
    prenom: string | null
    email: string
    role: string
    entreprises: { nom: string; logo_url: string | null } | null
  }
}

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Produits', href: '/produits', icon: Package },
  { name: 'Devis', href: '/devis', icon: FileText },
  { name: 'Factures', href: '/factures', icon: Receipt },
  { name: 'Fournisseurs', href: '/fournisseurs', icon: Truck },
  { name: 'Achats', href: '/factures-achat', icon: ShoppingCart },
  { name: 'Tresorerie', href: '/tresorerie', icon: Wallet },
  { name: 'Parametres', href: '/parametres', icon: Settings },
]

function SidebarContent({ utilisateur, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const logoUrl = utilisateur.entreprises?.logo_url

  return (
    <div className="flex flex-col h-full bg-[#1E2028]">
      {/* Logo */}
      <div className="h-[64px] flex items-center px-5 border-b border-white/[0.06]">
        {logoUrl ? (
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
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#17C2D7]/10 text-[#17C2D7]'
                  : 'text-[#9CA3AF] hover:bg-white/[0.04] hover:text-white'
              )}
            >
              <item.icon className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors duration-150",
                isActive ? "text-[#17C2D7]" : "text-[#6B7280] group-hover:text-[#9CA3AF]"
              )} />
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-[#17C2D7]/50" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-4 mx-3 mb-2">
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
      </div>
    </div>
  )
}

export function Sidebar({ utilisateur }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[240px] lg:flex-col">
        <SidebarContent utilisateur={utilisateur} />
      </div>

      {/* Mobile hamburger button */}
      <div className="lg:hidden fixed top-0 left-0 z-40 p-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white h-9 w-9 hover:bg-[#F9FAFB] transition-colors duration-150 shadow-sm">
            <Menu className="h-5 w-5 text-[#374151]" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[240px] border-r-0">
            <SidebarContent utilisateur={utilisateur} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
