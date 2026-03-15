'use client'

import { TableHead } from '@/components/ui/table'
import { ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react'
import type { SortDirection } from '@/lib/hooks/useTableSort'

interface SortableTableHeadProps {
  label: string
  columnKey: string
  sortKey: string | null
  sortDirection: SortDirection
  onToggleSort: (key: string) => void
  filterValue?: string
  onFilterChange?: (key: string, value: string) => void
  className?: string
  align?: 'left' | 'right' | 'center'
  filterable?: boolean
  sortable?: boolean
  filterPlaceholder?: string
}

export function SortableTableHead({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onToggleSort,
  filterValue = '',
  onFilterChange,
  className = '',
  align = 'left',
  filterable = true,
  sortable = true,
  filterPlaceholder,
}: SortableTableHeadProps) {
  const isActive = sortKey === columnKey
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <TableHead className={`text-[#6B7280] ${alignClass} ${className} py-2`}>
      <div className="flex flex-col gap-1">
        {/* Sort header */}
        {sortable ? (
          <button
            onClick={() => onToggleSort(columnKey)}
            className={`
              inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider
              hover:text-[#17C2D7] transition-colors duration-150 whitespace-nowrap
              ${align === 'right' ? 'justify-end' : ''}
              ${isActive ? 'text-[#17C2D7]' : 'text-[#6B7280]'}
            `}
          >
            {label}
            <span className="shrink-0">
              {isActive && sortDirection === 'asc' ? (
                <ChevronUp className="h-3 w-3" />
              ) : isActive && sortDirection === 'desc' ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronsUpDown className="h-3 w-3 opacity-30" />
              )}
            </span>
          </button>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
            {label}
          </span>
        )}

        {/* Filter input */}
        {filterable && onFilterChange && (
          <div className="relative">
            <input
              type="text"
              value={filterValue}
              onChange={(e) => onFilterChange(columnKey, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder={filterPlaceholder || 'Filtrer...'}
              className={`
                w-full h-6 px-1.5 text-[11px] font-normal normal-case tracking-normal
                border border-[#E5E7EB] rounded bg-white
                focus:outline-none focus:border-[#17C2D7] focus:ring-1 focus:ring-[#17C2D7]/20
                placeholder:text-[#D1D5DB]
                ${align === 'right' ? 'text-right' : ''}
                ${filterValue ? 'border-[#17C2D7] bg-[#17C2D7]/5' : ''}
              `}
            />
            {filterValue && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFilterChange(columnKey, '')
                }}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </TableHead>
  )
}
