'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

export interface SearchSelectOption {
  value: string
  label: string
  sublabel?: string
}

interface Props {
  options: SearchSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  disabled = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  const filtered = search.trim()
    ? options.filter((o) => {
        const q = search.toLowerCase()
        return (
          o.label.toLowerCase().includes(q) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(q))
        )
      })
    : options

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false)
      setSearch('')
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setOpen(false)
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
    }
    if (e.key === 'Enter' && filtered.length === 1) {
      e.preventDefault()
      handleSelect(filtered[0].value)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#17C2D7]/50 transition-colors"
        >
          {selectedOption ? (
            <span className="truncate text-[#111827]">{selectedOption.label}</span>
          ) : (
            <span className="text-[#9CA3AF]">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                onKeyDown={() => {}}
                className="rounded-full p-0.5 hover:bg-[#F3F4F6] transition-colors"
              >
                <X className="h-3.5 w-3.5 text-[#9CA3AF]" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-[#9CA3AF]" />
          </div>
        </button>
      ) : (
        /* Search input when open */
        <div className="flex h-9 items-center rounded-md border border-[#17C2D7] bg-white px-3 ring-2 ring-[#17C2D7]/20">
          <Search className="h-3.5 w-3.5 text-[#9CA3AF] shrink-0 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#9CA3AF]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="shrink-0 ml-1"
            >
              <X className="h-3.5 w-3.5 text-[#9CA3AF]" />
            </button>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-[240px] overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[#9CA3AF]">
              Aucun resultat
            </div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F9FAFB] ${
                  opt.value === value ? 'bg-[#17C2D7]/5 text-[#17C2D7]' : 'text-[#111827]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${opt.value === value ? 'text-[#17C2D7]' : ''}`}>
                    {opt.label}
                  </p>
                  {opt.sublabel && (
                    <p className="truncate text-[12px] text-[#9CA3AF]">{opt.sublabel}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
