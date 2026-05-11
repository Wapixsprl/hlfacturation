'use client'

import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export function ScrollButtons() {
  const [scrollY, setScrollY] = useState(0)
  const [pageHeight, setPageHeight] = useState(0)

  useEffect(() => {
    const update = () => {
      setScrollY(window.scrollY)
      setPageHeight(document.documentElement.scrollHeight - window.innerHeight)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const showUp = scrollY > 200
  const showDown = pageHeight > 200 && scrollY < pageHeight - 100

  if (!showUp && !showDown) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {showUp && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E5E7EB] shadow-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1B3A6B] transition-all"
          title="Haut de page"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}
      {showDown && (
        <button
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#E5E7EB] shadow-md text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#1B3A6B] transition-all"
          title="Bas de page"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
