'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isToday,
  isWithinInterval,
  parseISO,
  getDay,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, GanttChart, HardHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GanttView } from '@/components/planning/GanttView'

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
  titre: string
  statut: string
  date_debut: string | null
  date_fin_prevue: string | null
  equipe_id: string | null
  client: Client | null
  equipe: Equipe | null
}

interface PlanningPageContentProps {
  initialChantiers: Chantier[]
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

export function PlanningPageContent({ initialChantiers, equipes }: PlanningPageContentProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'semaine' | 'mois' | 'gantt'>('semaine')

  // Week view dates (Monday start)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Month view dates
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  // Pad to full weeks for the grid
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const calendarWeeks: Date[][] = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    calendarWeeks.push(calendarDays.slice(i, i + 7))
  }

  // Chantiers with valid dates
  const chantiersWithDates = useMemo(
    () => initialChantiers.filter((c) => c.date_debut),
    [initialChantiers]
  )

  // Group chantiers by equipe for week view
  const equipeRows = useMemo(() => {
    const rows: { equipe: Equipe | null; chantiers: Chantier[] }[] = []

    // One row per equipe
    for (const eq of equipes) {
      rows.push({
        equipe: eq,
        chantiers: chantiersWithDates.filter((c) => c.equipe_id === eq.id),
      })
    }

    // Non-assigned row
    const nonAssigned = chantiersWithDates.filter((c) => !c.equipe_id)
    rows.push({ equipe: null, chantiers: nonAssigned })

    return rows
  }, [equipes, chantiersWithDates])

  // Check if a chantier spans a given day
  function chantierOnDay(chantier: Chantier, day: Date): boolean {
    if (!chantier.date_debut) return false
    const start = parseISO(chantier.date_debut)
    const end = chantier.date_fin_prevue ? parseISO(chantier.date_fin_prevue) : start
    return isWithinInterval(day, { start, end })
  }

  // Check if chantier overlaps with the current view period
  function chantierInPeriod(chantier: Chantier, periodStart: Date, periodEnd: Date): boolean {
    if (!chantier.date_debut) return false
    const start = parseISO(chantier.date_debut)
    const end = chantier.date_fin_prevue ? parseISO(chantier.date_fin_prevue) : start
    return start <= periodEnd && end >= periodStart
  }

  // Get day columns a chantier spans within the week
  function getChantierSpan(chantier: Chantier, days: Date[]): { startIdx: number; endIdx: number } | null {
    if (!chantier.date_debut) return null
    const start = parseISO(chantier.date_debut)
    const end = chantier.date_fin_prevue ? parseISO(chantier.date_fin_prevue) : start

    let startIdx = -1
    let endIdx = -1

    for (let i = 0; i < days.length; i++) {
      if (isWithinInterval(days[i], { start, end }) || isSameDay(days[i], start) || isSameDay(days[i], end)) {
        if (startIdx === -1) startIdx = i
        endIdx = i
      }
    }

    if (startIdx === -1) return null
    return { startIdx, endIdx }
  }

  // Navigation
  function goNext() {
    setCurrentDate((d) => (viewMode === 'semaine' ? addWeeks(d, 1) : addMonths(d, 1)))
  }
  function goPrev() {
    setCurrentDate((d) => (viewMode === 'semaine' ? subWeeks(d, 1) : subMonths(d, 1)))
  }
  function goToday() {
    setCurrentDate(new Date())
  }

  // Header label
  const headerLabel =
    viewMode === 'semaine'
      ? `Semaine du ${format(weekStart, 'd', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })}`
      : format(currentDate, 'MMMM yyyy', { locale: fr }).replace(/^./, (c) => c.toUpperCase())

  const dayHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1B3A6B]/10">
              <CalendarDays className="h-5 w-5 text-[#1B3A6B]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Planning</h1>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* View toggle */}
            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
              <button
                onClick={() => setViewMode('semaine')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'semaine'
                    ? 'bg-[#1B3A6B] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Semaine
              </button>
              <button
                onClick={() => setViewMode('mois')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  viewMode === 'mois'
                    ? 'bg-[#1B3A6B] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                Mois
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                  viewMode === 'gantt'
                    ? 'bg-[#1B3A6B] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <GanttChart className="h-3.5 w-3.5" />
                Gantt
              </button>
            </div>

            {/* Navigation (hidden in Gantt mode — Gantt has its own controls) */}
            {viewMode !== 'gantt' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goPrev} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
                  {headerLabel}
                </span>
                <Button variant="outline" size="icon" onClick={goNext} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToday} className="text-xs">
                  {"Aujourd'hui"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop views */}
        <div className="hidden md:block">
          {viewMode === 'semaine' ? (
            <WeekView
              days={weekDays}
              dayHeaders={dayHeaders}
              equipeRows={equipeRows}
              getChantierSpan={getChantierSpan}
              chantierInPeriod={chantierInPeriod}
              weekStart={weekStart}
              weekEnd={weekEnd}
            />
          ) : viewMode === 'mois' ? (
            <MonthView
              calendarWeeks={calendarWeeks}
              dayHeaders={dayHeaders}
              currentDate={currentDate}
              chantiersWithDates={chantiersWithDates}
              chantierOnDay={chantierOnDay}
            />
          ) : (
            <GanttView
              chantiers={initialChantiers}
              equipes={equipes}
            />
          )}
        </div>

        {/* Mobile list view */}
        <div className="md:hidden">
          {viewMode === 'gantt' ? (
            <GanttView
              chantiers={initialChantiers}
              equipes={equipes}
            />
          ) : (
            <MobileListView
              viewMode={viewMode}
              chantiersWithDates={chantiersWithDates}
              chantierInPeriod={chantierInPeriod}
              weekStart={weekStart}
              weekEnd={weekEnd}
              monthStart={monthStart}
              monthEnd={monthEnd}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Week View
   ============================================================ */

interface WeekViewProps {
  days: Date[]
  dayHeaders: string[]
  equipeRows: { equipe: Equipe | null; chantiers: Chantier[] }[]
  getChantierSpan: (c: Chantier, days: Date[]) => { startIdx: number; endIdx: number } | null
  chantierInPeriod: (c: Chantier, start: Date, end: Date) => boolean
  weekStart: Date
  weekEnd: Date
}

function WeekView({ days, dayHeaders, equipeRows, getChantierSpan, chantierInPeriod, weekStart, weekEnd }: WeekViewProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-[#E2E8F0]">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase border-r border-[#E2E8F0]">
          Equipe
        </div>
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              'px-2 py-2 text-center border-r border-[#E2E8F0] last:border-r-0',
              isToday(day) && 'bg-blue-50'
            )}
          >
            <div className="text-xs font-medium text-gray-500">{dayHeaders[i]}</div>
            <div
              className={cn(
                'text-sm font-semibold mt-0.5',
                isToday(day) ? 'text-blue-600' : 'text-gray-900'
              )}
            >
              {format(day, 'd', { locale: fr })}
            </div>
          </div>
        ))}
      </div>

      {/* Equipe rows */}
      {equipeRows.map((row, rowIdx) => {
        const rowChantiers = row.chantiers.filter((c) => chantierInPeriod(c, weekStart, weekEnd))

        return (
          <div
            key={row.equipe?.id || 'non-assigne'}
            className={cn(
              'grid grid-cols-[160px_repeat(7,1fr)] border-b border-[#E2E8F0] last:border-b-0',
              'min-h-[60px]'
            )}
          >
            {/* Equipe label */}
            <div className="px-3 py-2 border-r border-[#E2E8F0] flex items-start gap-2">
              {row.equipe ? (
                <>
                  <span
                    className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: row.equipe.couleur }}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {row.equipe.nom}
                  </span>
                </>
              ) : (
                <>
                  <HardHat className="mt-0.5 h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-400 italic">Non assign&eacute;</span>
                </>
              )}
            </div>

            {/* Day cells with chantier blocks */}
            <div className="col-span-7 relative">
              {/* Grid lines */}
              <div className="grid grid-cols-7 h-full absolute inset-0">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      'border-r border-[#E2E8F0] last:border-r-0 h-full',
                      isToday(day) && 'bg-blue-50/50'
                    )}
                  />
                ))}
              </div>

              {/* Chantier blocks */}
              <div className="relative py-1 space-y-1 min-h-[56px]">
                {rowChantiers.map((chantier) => {
                  const span = getChantierSpan(chantier, days)
                  if (!span) return null
                  const color = row.equipe?.couleur || chantier.equipe?.couleur || '#9CA3AF'
                  const left = `${(span.startIdx / 7) * 100}%`
                  const width = `${((span.endIdx - span.startIdx + 1) / 7) * 100}%`

                  return (
                    <Link
                      key={chantier.id}
                      href={`/chantiers/${chantier.id}`}
                      className="block relative mx-0.5"
                      style={{
                        marginLeft: left,
                        width: width,
                      }}
                    >
                      <div
                        className="rounded-md px-2 py-1 text-xs cursor-pointer hover:opacity-80 transition-opacity border-l-[3px]"
                        style={{
                          backgroundColor: hexToRgba(color, 0.15),
                          borderLeftColor: color,
                        }}
                      >
                        <div className="font-medium text-gray-800 truncate">
                          {chantier.titre}
                        </div>
                        {chantier.client && (
                          <div className="text-gray-500 truncate text-[10px]">
                            {getClientName(chantier.client)}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
                {rowChantiers.length === 0 && <div className="h-[40px]" />}
              </div>
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {equipeRows.every((r) => r.chantiers.filter((c) => {
        if (!c.date_debut) return false
        const start = parseISO(c.date_debut)
        const end = c.date_fin_prevue ? parseISO(c.date_fin_prevue) : start
        return start <= weekEnd && end >= weekStart
      }).length === 0) && (
        <div className="py-12 text-center text-gray-400">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucun chantier planifi&eacute; cette semaine</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Month View
   ============================================================ */

interface MonthViewProps {
  calendarWeeks: Date[][]
  dayHeaders: string[]
  currentDate: Date
  chantiersWithDates: Chantier[]
  chantierOnDay: (c: Chantier, day: Date) => boolean
}

function MonthView({ calendarWeeks, dayHeaders, currentDate, chantiersWithDates, chantierOnDay }: MonthViewProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#E2E8F0]">
        {dayHeaders.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {calendarWeeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-[#E2E8F0] last:border-b-0">
          {week.map((day, di) => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayChantiers = chantiersWithDates.filter((c) => chantierOnDay(c, day))
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isExpanded = expandedDay === dayKey

            return (
              <div
                key={di}
                className={cn(
                  'min-h-[80px] p-1.5 border-r border-[#E2E8F0] last:border-r-0 cursor-pointer transition-colors',
                  !isCurrentMonth && 'bg-gray-50/50',
                  isToday(day) && 'bg-blue-50 border-blue-200',
                  isExpanded && 'bg-gray-50'
                )}
                onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
              >
                <div
                  className={cn(
                    'text-xs font-medium mb-1',
                    isToday(day) ? 'text-blue-600 font-bold' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                  )}
                >
                  {format(day, 'd')}
                </div>

                {/* Chantier pills */}
                <div className="space-y-0.5">
                  {(isExpanded ? dayChantiers : dayChantiers.slice(0, 3)).map((chantier) => {
                    const color = chantier.equipe?.couleur || '#9CA3AF'
                    return (
                      <Link
                        key={chantier.id}
                        href={`/chantiers/${chantier.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block"
                      >
                        <div
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium truncate hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: hexToRgba(color, 0.2),
                            color: color,
                          }}
                        >
                          {chantier.titre}
                        </div>
                      </Link>
                    )
                  })}
                  {!isExpanded && dayChantiers.length > 3 && (
                    <div className="text-[10px] text-gray-400 pl-1">
                      +{dayChantiers.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   Mobile List View
   ============================================================ */

interface MobileListViewProps {
  viewMode: 'semaine' | 'mois' | 'gantt'
  chantiersWithDates: Chantier[]
  chantierInPeriod: (c: Chantier, start: Date, end: Date) => boolean
  weekStart: Date
  weekEnd: Date
  monthStart: Date
  monthEnd: Date
}

function MobileListView({
  viewMode,
  chantiersWithDates,
  chantierInPeriod,
  weekStart,
  weekEnd,
  monthStart,
  monthEnd,
}: MobileListViewProps) {
  const periodStart = viewMode === 'semaine' ? weekStart : monthStart
  const periodEnd = viewMode === 'semaine' ? weekEnd : monthEnd

  const periodChantiers = chantiersWithDates
    .filter((c) => chantierInPeriod(c, periodStart, periodEnd))
    .sort((a, b) => {
      if (!a.date_debut || !b.date_debut) return 0
      return a.date_debut.localeCompare(b.date_debut)
    })

  if (periodChantiers.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E2E8F0] py-12 text-center text-gray-400">
        <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Aucun chantier planifi&eacute; cette p&eacute;riode</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {periodChantiers.map((chantier) => {
        const color = chantier.equipe?.couleur || '#9CA3AF'
        return (
          <Link key={chantier.id} href={`/chantiers/${chantier.id}`}>
            <div
              className="bg-white rounded-lg border border-[#E2E8F0] p-3 flex items-start gap-3 hover:shadow-sm transition-shadow border-l-[3px]"
              style={{ borderLeftColor: color }}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{chantier.titre}</div>
                {chantier.client && (
                  <div className="text-xs text-gray-500 mt-0.5">{getClientName(chantier.client)}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {chantier.date_debut && format(parseISO(chantier.date_debut), 'd MMM', { locale: fr })}
                  {chantier.date_fin_prevue && (
                    <> &rarr; {format(parseISO(chantier.date_fin_prevue), 'd MMM', { locale: fr })}</>
                  )}
                </div>
              </div>
              {chantier.equipe && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: hexToRgba(color, 0.15),
                    color: color,
                  }}
                >
                  {chantier.equipe.nom}
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
