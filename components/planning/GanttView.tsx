'use client'

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  differenceInDays,
  addDays,
  format,
  startOfDay,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isToday,
  parseISO,
  min as dateMin,
  max as dateMax,
  getISOWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ZoomIn, ZoomOut, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  nom: string | null
  prenom: string | null
  raison_sociale: string | null
  type: string | null
}

interface Equipe {
  id: string
  nom: string
  couleur: string
}

interface Chantier {
  id: string
  numero?: string
  titre: string
  statut: string
  date_debut: string | null
  date_fin_prevue: string | null
  equipe_id: string | null
  client: Client | null
  equipe: Equipe | null
}

type TimeScale = 'jour' | 'semaine' | 'mois'

interface GanttViewProps {
  chantiers: Chantier[]
  equipes: Equipe[]
}

function getClientName(client: Client | null): string {
  if (!client) return ''
  if (client.type === 'professionnel' && client.raison_sociale) {
    return client.raison_sociale
  }
  return [client.prenom, client.nom].filter(Boolean).join(' ') || 'Client'
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Darken a hex color for text readability */
function darkenHex(hex: string, factor: number): string {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor)
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor)
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor)
  return `rgb(${r}, ${g}, ${b})`
}

const COLUMN_WIDTHS: Record<TimeScale, number> = {
  jour: 40,
  semaine: 120,
  mois: 180,
}

const ROW_HEIGHT = 44
const HEADER_HEIGHT = 52
const SIDEBAR_WIDTH = 200

export function GanttView({ chantiers, equipes }: GanttViewProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>('semaine')
  const [tooltip, setTooltip] = useState<{ chantier: Chantier; x: number; y: number } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter chantiers with valid dates
  const chantiersWithDates = useMemo(
    () => chantiers.filter((c) => c.date_debut),
    [chantiers]
  )

  // Group by equipe
  const groupedRows = useMemo(() => {
    const rows: { equipe: Equipe | null; chantiers: Chantier[] }[] = []

    for (const eq of equipes) {
      const eqChantiers = chantiersWithDates.filter((c) => c.equipe_id === eq.id)
      if (eqChantiers.length > 0) {
        rows.push({ equipe: eq, chantiers: eqChantiers })
      }
    }

    const nonAssigned = chantiersWithDates.filter((c) => !c.equipe_id)
    if (nonAssigned.length > 0) {
      rows.push({ equipe: null, chantiers: nonAssigned })
    }

    return rows
  }, [equipes, chantiersWithDates])

  // Flat list for row rendering
  type EquipeRow = { type: 'equipe'; equipe: Equipe | null }
  type ChantierRow = { type: 'chantier'; chantier: Chantier; equipe: Equipe | null }
  type FlatRow = EquipeRow | ChantierRow

  const flatRows = useMemo((): FlatRow[] => {
    const items: FlatRow[] = []

    for (const group of groupedRows) {
      items.push({ type: 'equipe', equipe: group.equipe })
      for (const ch of group.chantiers) {
        items.push({ type: 'chantier', chantier: ch, equipe: group.equipe })
      }
    }

    return items
  }, [groupedRows])

  // Compute date range (add padding)
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    if (chantiersWithDates.length === 0) {
      const today = startOfDay(new Date())
      return { rangeStart: addDays(today, -30), rangeEnd: addDays(today, 60), totalDays: 90 }
    }

    const starts = chantiersWithDates.map((c) => parseISO(c.date_debut!))
    const ends = chantiersWithDates.map((c) =>
      c.date_fin_prevue ? parseISO(c.date_fin_prevue) : parseISO(c.date_debut!)
    )

    const earliest = dateMin(starts)
    const latest = dateMax(ends)

    // Add padding
    const paddingDays = timeScale === 'mois' ? 60 : timeScale === 'semaine' ? 14 : 7
    const rs = startOfDay(addDays(earliest, -paddingDays))
    const re = startOfDay(addDays(latest, paddingDays))
    const td = differenceInDays(re, rs) + 1

    return { rangeStart: rs, rangeEnd: re, totalDays: td }
  }, [chantiersWithDates, timeScale])

  // Column width
  const colWidth = COLUMN_WIDTHS[timeScale]

  // Generate time columns based on scale
  const timeColumns = useMemo(() => {
    if (timeScale === 'jour') {
      return eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((d) => ({
        date: d,
        label: format(d, 'd', { locale: fr }),
        subLabel: format(d, 'EEE', { locale: fr }),
        width: colWidth,
      }))
    }

    if (timeScale === 'semaine') {
      const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 })
      return weeks.map((weekStart) => ({
        date: weekStart,
        label: `S${getISOWeek(weekStart)}`,
        subLabel: format(weekStart, 'd MMM', { locale: fr }),
        width: colWidth,
      }))
    }

    // mois
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })
    return months.map((m) => ({
      date: m,
      label: format(m, 'MMM yyyy', { locale: fr }),
      subLabel: '',
      width: colWidth,
    }))
  }, [timeScale, rangeStart, rangeEnd, colWidth])

  // Total timeline width
  const timelineWidth = timeColumns.length * colWidth

  // Get pixel position for a date
  const getDatePosition = useCallback(
    (date: Date): number => {
      const days = differenceInDays(startOfDay(date), rangeStart)
      return (days / totalDays) * timelineWidth
    },
    [rangeStart, totalDays, timelineWidth]
  )

  // Today position
  const todayPosition = getDatePosition(new Date())

  // Auto-scroll to today on mount and scale change
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const targetScroll = todayPosition - container.clientWidth / 3
    container.scrollLeft = Math.max(0, targetScroll)
  }, [todayPosition, timeScale])

  // Scale controls
  const scales: TimeScale[] = ['jour', 'semaine', 'mois']
  function zoomIn() {
    const idx = scales.indexOf(timeScale)
    if (idx > 0) setTimeScale(scales[idx - 1])
  }
  function zoomOut() {
    const idx = scales.indexOf(timeScale)
    if (idx < scales.length - 1) setTimeScale(scales[idx + 1])
  }

  const handleBarMouseEnter = useCallback((e: React.MouseEvent, chantier: Chantier) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltip({
      chantier,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }, [])

  const handleBarMouseLeave = useCallback(() => {
    tooltipTimeoutRef.current = setTimeout(() => setTooltip(null), 150)
  }, [])

  if (chantiersWithDates.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] py-12 text-center text-gray-400">
        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucun chantier planifi&eacute; &agrave; afficher</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      {/* Zoom controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#E2E8F0] bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Echelle :</span>
          {scales.map((s) => (
            <button
              key={s}
              onClick={() => setTimeScale(s)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                timeScale === s
                  ? 'bg-[#1B3A6B] text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              )}
            >
              {s === 'jour' ? 'Jour' : s === 'semaine' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={zoomIn}
            disabled={timeScale === 'jour'}
            title="Zoom avant"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={zoomOut}
            disabled={timeScale === 'mois'}
            title="Zoom arrière"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex relative">
        {/* Sidebar - chantier names */}
        <div
          className="flex-shrink-0 border-r border-[#E2E8F0] bg-white z-10"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {/* Sidebar header */}
          <div
            className="px-3 flex items-center border-b border-[#E2E8F0] bg-gray-50/80 text-xs font-medium text-gray-500 uppercase"
            style={{ height: HEADER_HEIGHT }}
          >
            Chantiers
          </div>

          {/* Sidebar rows */}
          {flatRows.map((row, idx) => {
            if (row.type === 'equipe') {
              const eq = row.equipe
              return (
                <div
                  key={`eq-${eq?.id || 'none'}`}
                  className="px-3 flex items-center gap-2 border-b border-[#E2E8F0] bg-gray-50/60"
                  style={{ height: ROW_HEIGHT * 0.75 }}
                >
                  {eq ? (
                    <>
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: eq.couleur }}
                      />
                      <span className="text-xs font-semibold text-gray-600 truncate">
                        {eq.nom}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-gray-400 italic">
                      Non assign&eacute;
                    </span>
                  )}
                </div>
              )
            }

            const ch = row.chantier
            return (
              <div
                key={`ch-${ch.id}`}
                className="px-3 flex flex-col justify-center border-b border-[#E2E8F0] hover:bg-gray-50 transition-colors"
                style={{ height: ROW_HEIGHT }}
              >
                <Link
                  href={`/chantiers/${ch.id}`}
                  className="text-xs font-medium text-gray-700 truncate hover:text-[#1B3A6B] transition-colors"
                  title={ch.titre}
                >
                  {ch.titre}
                </Link>
                {ch.client && (
                  <span className="text-[10px] text-gray-400 truncate">
                    {getClientName(ch.client)}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Timeline area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto"
        >
          <div style={{ width: timelineWidth, position: 'relative' }}>
            {/* Time header */}
            <div
              className="flex border-b border-[#E2E8F0] bg-gray-50/80 sticky top-0 z-[5]"
              style={{ height: HEADER_HEIGHT }}
            >
              {timeColumns.map((col, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-shrink-0 flex flex-col items-center justify-center border-r border-[#E2E8F0] last:border-r-0',
                    timeScale === 'jour' && isToday(col.date) && 'bg-blue-50'
                  )}
                  style={{ width: col.width }}
                >
                  <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                  {col.subLabel && (
                    <span className="text-[10px] text-gray-400">{col.subLabel}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows with bars */}
            {flatRows.map((row) => {
              if (row.type === 'equipe') {
                const eq = row.equipe
                return (
                  <div
                    key={`eq-bar-${eq?.id || 'none'}`}
                    className="border-b border-[#E2E8F0] bg-gray-50/60 relative"
                    style={{ height: ROW_HEIGHT * 0.75 }}
                  >
                    {/* Column lines */}
                    <div className="absolute inset-0 flex">
                      {timeColumns.map((col, i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 border-r border-[#E2E8F0]/50 last:border-r-0"
                          style={{ width: col.width }}
                        />
                      ))}
                    </div>
                  </div>
                )
              }

              const ch = row.chantier
              const eqColor = row.equipe?.couleur || ch.equipe?.couleur || '#9CA3AF'

              // Calculate bar position
              const chStart = parseISO(ch.date_debut!)
              const chEnd = ch.date_fin_prevue ? parseISO(ch.date_fin_prevue) : chStart

              const barLeft = getDatePosition(chStart)
              const barRight = getDatePosition(addDays(chEnd, 1))
              const barWidth = Math.max(barRight - barLeft, 8)

              return (
                <div
                  key={`ch-bar-${ch.id}`}
                  className="border-b border-[#E2E8F0] relative"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Column lines */}
                  <div className="absolute inset-0 flex">
                    {timeColumns.map((col, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-shrink-0 border-r border-[#E2E8F0]/50 last:border-r-0',
                          timeScale === 'jour' && isToday(col.date) && 'bg-blue-50/30'
                        )}
                        style={{ width: col.width }}
                      />
                    ))}
                  </div>

                  {/* Chantier bar */}
                  <Link
                    href={`/chantiers/${ch.id}`}
                    className="absolute top-1.5 group"
                    style={{
                      left: barLeft,
                      width: barWidth,
                      height: ROW_HEIGHT - 12,
                    }}
                    onMouseEnter={(e) => handleBarMouseEnter(e, ch)}
                    onMouseLeave={handleBarMouseLeave}
                  >
                    <div
                      className="h-full rounded-md border flex items-center px-2 overflow-hidden cursor-pointer group-hover:shadow-md transition-shadow"
                      style={{
                        backgroundColor: hexToRgba(eqColor, 0.2),
                        borderColor: hexToRgba(eqColor, 0.4),
                      }}
                    >
                      {barWidth > 60 && (
                        <div className="truncate">
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: darkenHex(eqColor, 0.6) }}
                          >
                            {ch.titre}
                          </span>
                          {barWidth > 140 && ch.client && (
                            <span
                              className="text-[9px] ml-1.5 opacity-70"
                              style={{ color: darkenHex(eqColor, 0.6) }}
                            >
                              — {getClientName(ch.client)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              )
            })}

            {/* Today marker */}
            <div
              className="absolute top-0 bottom-0 z-[4] pointer-events-none"
              style={{ left: todayPosition }}
            >
              <div className="w-px h-full border-l-2 border-dashed border-red-500 opacity-70" />
              <div className="absolute -top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-b-md">
                Auj.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-lg px-3 py-2 text-xs max-w-[250px]">
            <div className="font-semibold mb-1">{tooltip.chantier.titre}</div>
            {tooltip.chantier.numero && (
              <div className="text-gray-300 mb-0.5">{tooltip.chantier.numero}</div>
            )}
            {tooltip.chantier.client && (
              <div className="text-gray-300 mb-0.5">
                Client : {getClientName(tooltip.chantier.client)}
              </div>
            )}
            <div className="text-gray-300">
              {tooltip.chantier.date_debut &&
                format(parseISO(tooltip.chantier.date_debut), 'd MMM yyyy', { locale: fr })}
              {tooltip.chantier.date_fin_prevue && (
                <>
                  {' → '}
                  {format(parseISO(tooltip.chantier.date_fin_prevue), 'd MMM yyyy', { locale: fr })}
                </>
              )}
            </div>
            {tooltip.chantier.client && (
              <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-gray-700">
                <span className="text-gray-300">{getClientName(tooltip.chantier.client)}</span>
              </div>
            )}
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  )
}
