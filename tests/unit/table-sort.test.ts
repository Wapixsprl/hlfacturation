import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTableSort, type ColumnConfig } from '@/lib/hooks/useTableSort'

type Client = { nom: string; ca: number; ville: string | null }

const clients: Client[] = [
  { nom: 'Martin', ca: 5000, ville: 'Liège' },
  { nom: 'Dupont', ca: 12000, ville: 'Bruxelles' },
  { nom: 'Lebrun', ca: 800,   ville: null },
  { nom: 'Adam',   ca: 3000,  ville: 'Tournai' },
]

const columns: ColumnConfig<Client>[] = [
  { key: 'nom',   getValue: (c) => c.nom,   sortType: 'string' },
  { key: 'ca',    getValue: (c) => c.ca,    sortType: 'number' },
  { key: 'ville', getValue: (c) => c.ville, sortType: 'string' },
]

describe('useTableSort — tri', () => {
  it('retourne les données dans leur ordre original sans tri actif', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    expect(result.current.sortedAndFiltered.map((c) => c.nom))
      .toEqual(['Martin', 'Dupont', 'Lebrun', 'Adam'])
  })

  it('trie par nom alphabétique (asc)', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.toggleSort('nom'))
    expect(result.current.sortedAndFiltered.map((c) => c.nom))
      .toEqual(['Adam', 'Dupont', 'Lebrun', 'Martin'])
  })

  it('trie par nom inversé (desc) au deuxième clic', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.toggleSort('nom'))
    act(() => result.current.toggleSort('nom'))
    expect(result.current.sortedAndFiltered.map((c) => c.nom))
      .toEqual(['Martin', 'Lebrun', 'Dupont', 'Adam'])
  })

  it('désactive le tri au troisième clic (retour ordre original)', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.toggleSort('nom'))
    act(() => result.current.toggleSort('nom'))
    act(() => result.current.toggleSort('nom'))
    expect(result.current.sortKey).toBeNull()
    expect(result.current.sortDirection).toBeNull()
  })

  it('trie par CA numérique (asc)', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.toggleSort('ca'))
    expect(result.current.sortedAndFiltered.map((c) => c.ca))
      .toEqual([800, 3000, 5000, 12000])
  })

  it('trie par CA numérique (desc)', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.toggleSort('ca'))
    act(() => result.current.toggleSort('ca'))
    expect(result.current.sortedAndFiltered.map((c) => c.ca))
      .toEqual([12000, 5000, 3000, 800])
  })

  it('place les nulls en fin de liste lors du tri asc', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.toggleSort('ville'))
    const sorted = result.current.sortedAndFiltered
    expect(sorted[sorted.length - 1].ville).toBeNull()
  })
})

describe('useTableSort — filtrage', () => {
  it('filtre par sous-chaîne insensible à la casse', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.setColumnFilter('nom', 'du'))
    expect(result.current.sortedAndFiltered.map((c) => c.nom)).toEqual(['Dupont'])
  })

  it('filtre sur plusieurs colonnes simultanément', () => {
    const data: Client[] = [
      { nom: 'Dupont',  ca: 1000, ville: 'Bruxelles' },
      { nom: 'Durand',  ca: 2000, ville: 'Liège' },
      { nom: 'Dumont',  ca: 3000, ville: 'Bruxelles' },
    ]
    const { result } = renderHook(() => useTableSort(data, columns))
    act(() => result.current.setColumnFilter('nom', 'du'))
    act(() => result.current.setColumnFilter('ville', 'bru'))
    expect(result.current.sortedAndFiltered.map((c) => c.nom))
      .toEqual(['Dupont', 'Dumont'])
  })

  it('efface un filtre en passant une chaîne vide', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.setColumnFilter('nom', 'dup'))
    act(() => result.current.setColumnFilter('nom', ''))
    expect(result.current.sortedAndFiltered).toHaveLength(clients.length)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('clearAllFilters remet tout à zéro', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.toggleSort('nom'))
    act(() => result.current.setColumnFilter('nom', 'martin'))
    act(() => result.current.clearAllFilters())
    expect(result.current.sortKey).toBeNull()
    expect(result.current.hasActiveFilters).toBe(false)
    expect(result.current.sortedAndFiltered).toHaveLength(clients.length)
  })

  it('retourne liste vide si aucun résultat', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    act(() => result.current.setColumnFilter('nom', 'zzz_inexistant'))
    expect(result.current.sortedAndFiltered).toHaveLength(0)
  })

  it('hasActiveFilters est true quand un filtre est actif', () => {
    const { result } = renderHook(() => useTableSort(clients, columns))
    expect(result.current.hasActiveFilters).toBe(false)
    act(() => result.current.setColumnFilter('nom', 'x'))
    expect(result.current.hasActiveFilters).toBe(true)
  })
})

describe('useTableSort — tri + filtre combinés', () => {
  it('filtre puis trie les résultats filtrés', () => {
    const data: Client[] = [
      { nom: 'Dupont', ca: 3000, ville: 'Liège' },
      { nom: 'Durand', ca: 1000, ville: 'Liège' },
      { nom: 'Martin', ca: 2000, ville: 'Bruxelles' },
    ]
    const { result } = renderHook(() => useTableSort(data, columns))
    act(() => result.current.setColumnFilter('ville', 'liège'))
    act(() => result.current.toggleSort('ca'))
    expect(result.current.sortedAndFiltered.map((c) => c.nom))
      .toEqual(['Durand', 'Dupont'])
  })
})
