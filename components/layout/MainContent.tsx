'use client'

import { cn } from '@/lib/utils'
import { useSidebarState } from '@/lib/hooks/useSidebarState'

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState()

  return (
    <div className={cn(
      "transition-all duration-200",
      collapsed ? "lg:pl-[64px]" : "lg:pl-[240px]"
    )}>
      {children}
    </div>
  )
}
