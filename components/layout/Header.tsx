'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight, Home, Bell } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  utilisateur: {
    nom: string | null
    prenom: string | null
    role: string
  }
}

const routeNames: Record<string, string> = {
  dashboard: 'Tableau de bord',
  clients: 'Clients',
  produits: 'Produits',
  devis: 'Devis',
  factures: 'Factures',
  fournisseurs: 'Fournisseurs',
  'factures-achat': 'Factures d\'achat',
  tresorerie: 'Tresorerie',
  parametres: 'Parametres',
  nouveau: 'Nouveau',
}

export function Header({ utilisateur }: HeaderProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="h-[56px] border-b border-[#E5E7EB] bg-white flex items-center px-4 sm:px-6">
      <nav className="flex items-center gap-1.5 text-[13px]">
        <Link href="/dashboard" className="text-[#9CA3AF] hover:text-[#17C2D7] transition-colors duration-150">
          <Home className="h-4 w-4" />
        </Link>
        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/')
          const name = routeNames[segment] || segment
          const isLast = index === segments.length - 1

          return (
            <span key={href} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-[#D1D5DB]" />
              {isLast ? (
                <span className="font-semibold text-[#111827]">{name}</span>
              ) : (
                <Link href={href} className="text-[#9CA3AF] hover:text-[#17C2D7] transition-colors duration-150">
                  {name}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-4">
        <button className="relative text-[#9CA3AF] hover:text-[#17C2D7] transition-colors duration-150">
          <Bell className="h-[18px] w-[18px]" />
        </button>
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#17C2D7]/10 rounded-full flex items-center justify-center">
            <span className="text-[#17C2D7] text-[10px] font-semibold">
              {(utilisateur.prenom?.[0] || '').toUpperCase()}{(utilisateur.nom?.[0] || '').toUpperCase()}
            </span>
          </div>
          <span className="text-[12px] text-[#6B7280] font-medium">
            {utilisateur.prenom} {utilisateur.nom}
          </span>
        </div>
      </div>
    </header>
  )
}
