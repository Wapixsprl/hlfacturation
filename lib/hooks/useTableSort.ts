'use client'

import { useState, useMemo, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface ColumnConfig<T> {
  key: string
  getValue: (item: T) => string | number | null | undefined
  sortType?: 'string' | 'number' | 'date'
}

export interface UseTableSortReturn<T> {
  sortedAndFiltered: T[]
  sortKey: string | null
  sortDirection: SortDirection
  columnFilters: Record<string, string>
  toggleSort: (key: string) => void
  setColumnFilter: (key: string, value: string) => void
  clearAllFilters: () => void
  hasActiveFilters: boolean
}

export function useTableSort<T>(
  data: T[],
  columns: ColumnConfig<T>[]
): UseTableSortReturn<T> {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }, [sortKey, sortDirection])

  const setColumnFilter = useCallback((key: string, value: string) => {
    setColumnFilters((prev) => {
      if (!value) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setColumnFilters({})
    setSortKey(null)
    setSortDirection(null)
  }, [])

  const hasActiveFilters = Object.keys(columnFilters).length > 0

  const sortedAndFiltered = useMemo(() => {
    let items = [...data]

    // Apply column filters
    for (const [key, filterValue] of Object.entries(columnFilters)) {
      if (!filterValue) continue
      const col = columns.find((c) => c.key === key)
      if (!col) continue
      const lowerFilter = filterValue.toLowerCase()
      items = items.filter((item) => {
        const cellValue = col.getValue(item)
        if (cellValue === null || cellValue === undefined) return false
        return String(cellValue).toLowerCase().includes(lowerFilter)
      })
    }

    // Apply sort
    if (sortKey && sortDirection) {
      const col = columns.find((c) => c.key === sortKey)
      if (col) {
        items.sort((a, b) => {
          const va = col.getValue(a)
          const vb = col.getValue(b)

          // Handle nulls
          if (va == null && vb == null) return 0
          if (va == null) return sortDirection === 'asc' ? 1 : -1
          if (vb == null) return sortDirection === 'asc' ? -1 : 1

          const type = col.sortType || (typeof va === 'number' ? 'number' : 'string')

          let comparison = 0
          if (type === 'number') {
            comparison = Number(va) - Number(vb)
          } else if (type === 'date') {
            comparison = new Date(String(va)).getTime() - new Date(String(vb)).getTime()
          } else {
            comparison = String(va).localeCompare(String(vb), 'fr-BE', { sensitivity: 'base' })
          }

          return sortDirection === 'asc' ? comparison : -comparison
        })
      }
    }

    return items
  }, [data, columns, sortKey, sortDirection, columnFilters])

  return {
    sortedAndFiltered,
    sortKey,
    sortDirection,
    columnFilters,
    toggleSort,
    setColumnFilter,
    clearAllFilters,
    hasActiveFilters,
  }
}
