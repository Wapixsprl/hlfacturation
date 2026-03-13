'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMontant, formatDate } from '@/lib/utils'
import {
  Users,
  FileText,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Target,
  CalendarDays,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts'

interface Props {
  stats: {
    clients: number
    devisEnCours: number
    devisAcceptes: number
    caDevis: number
    facturesEnAttente: number
    facturesImpayees: number
  }
  recentDevis: Array<{
    id: string
    numero: string
    titre: string | null
    statut: string
    total_ttc: number
    client: { nom: string | null; prenom: string | null; raison_sociale: string | null; type: string } | null
  }>
  recentFactures: Array<{
    id: string
    numero: string
    statut: string
    total_ttc: number
    solde_ttc: number
    total_paye: number
    date_echeance: string | null
    client: { nom: string | null; prenom: string | null; raison_sociale: string | null; type: string } | null
  }>
  caMensuel: number
  caAnnuel: number
  objectifAnnuel: number | null
  caMoisParMois: number[]
  currentYear: number
}

const statutDevisConfig: Record<string, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-[#F3F4F6] text-[#6B7280]' },
  envoye: { label: 'Envoye', className: 'bg-[#17C2D7]/10 text-[#17C2D7]' },
  accepte: { label: 'Accepte', className: 'bg-[#D1FAE5] text-[#059669]' },
  refuse: { label: 'Refuse', className: 'bg-[#FEE2E2] text-[#DC2626]' },
  converti: { label: 'Converti', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
}

const statutFactureConfig: Record<string, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-[#F3F4F6] text-[#6B7280]' },
  envoyee: { label: 'Envoyee', className: 'bg-[#17C2D7]/10 text-[#17C2D7]' },
  partiellement_payee: { label: 'Partiel', className: 'bg-[#FEF3C7] text-[#D97706]' },
  payee: { label: 'Payee', className: 'bg-[#D1FAE5] text-[#059669]' },
  en_retard: { label: 'En retard', className: 'bg-[#FEE2E2] text-[#DC2626]' },
}

const moisLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

function formatCompact(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')} M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)} k`
  return n.toFixed(0)
}

export function DashboardContent({
  stats,
  recentDevis,
  recentFactures,
  caMensuel,
  caAnnuel,
  objectifAnnuel,
  caMoisParMois,
  currentYear,
}: Props) {
  const clientName = (d: { client: { nom: string | null; prenom: string | null; raison_sociale: string | null; type: string } | null }) => {
    if (!d.client) return '\u2014'
    return d.client.type === 'professionnel' && d.client.raison_sociale
      ? d.client.raison_sociale
      : [d.client.prenom, d.client.nom].filter(Boolean).join(' ') || '\u2014'
  }

  // Construire les donnees du graphique (CA cumule vs Objectif)
  const objectifMensuel = objectifAnnuel ? objectifAnnuel / 12 : 0
  const currentMonth = new Date().getMonth()

  const chartData = moisLabels.map((mois, i) => {
    const caCumule = caMoisParMois.slice(0, i + 1).reduce((s, v) => s + v, 0)
    const objectifCumule = objectifAnnuel ? objectifMensuel * (i + 1) : null
    return {
      mois,
      objectif: objectifCumule ? Math.round(objectifCumule) : null,
      // N'afficher le CA que jusqu'au mois en cours
      caVisible: i <= currentMonth ? Math.round(caCumule) : null,
    }
  })

  const progressPct = objectifAnnuel && objectifAnnuel > 0
    ? Math.min(Math.round((caAnnuel / objectifAnnuel) * 100), 999)
    : null

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#111827] mb-6">Tableau de bord</h1>

      {/* KPI Cards - Row 1 : CA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <Link href="/factures" className="block h-full">
          <Card className="border-[#E5E7EB] hover-lift cursor-pointer hover:border-[#17C2D7]/40 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">CA Mensuel</CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#17C2D7]/10">
                <CalendarDays className="h-4 w-4 text-[#17C2D7]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#111827]">{formatMontant(caMensuel)}</div>
              <p className="text-[12px] text-[#9CA3AF] mt-0.5">HT &mdash; mois en cours</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/factures" className="block h-full">
          <Card className="border-[#E5E7EB] hover-lift cursor-pointer hover:border-[#17C2D7]/40 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">CA Annuel {currentYear}</CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#D1FAE5]">
                <TrendingUp className="h-4 w-4 text-[#059669]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#111827]">{formatMontant(caAnnuel)}</div>
              <p className="text-[12px] text-[#9CA3AF] mt-0.5">HT &mdash; cumul annee</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/parametres" className="block h-full">
          <Card className="border-[#E5E7EB] hover-lift cursor-pointer hover:border-[#17C2D7]/40 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">Objectif {currentYear}</CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#EDE9FE]">
                <Target className="h-4 w-4 text-[#7C3AED]" />
              </div>
            </CardHeader>
            <CardContent>
              {objectifAnnuel ? (
                <>
                  <div className="text-2xl font-bold text-[#111827]">{progressPct}%</div>
                  <div className="mt-2 h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(progressPct || 0, 100)}%`,
                        backgroundColor: (progressPct || 0) >= 100 ? '#059669' : '#17C2D7',
                      }}
                    />
                  </div>
                  <p className="text-[12px] text-[#9CA3AF] mt-1.5">
                    {formatMontant(caAnnuel)} / {formatMontant(objectifAnnuel)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-lg text-[#9CA3AF]">&mdash;</div>
                  <p className="text-[12px] text-[#9CA3AF] mt-0.5">
                    Definir un objectif
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* KPI Cards - Row 2 : Activite */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/clients" className="block h-full">
          <Card className="border-[#E5E7EB] hover-lift cursor-pointer hover:border-[#17C2D7]/40 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">Clients</CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#17C2D7]/10">
                <Users className="h-4 w-4 text-[#17C2D7]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#111827]">{stats.clients}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/devis" className="block h-full">
          <Card className="border-[#E5E7EB] hover-lift cursor-pointer hover:border-[#17C2D7]/40 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">Devis en cours</CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#17C2D7]/10">
                <FileText className="h-4 w-4 text-[#17C2D7]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#111827]">{stats.devisEnCours}</div>
              <p className="text-[12px] text-[#9CA3AF] mt-0.5">{stats.devisAcceptes} acceptes</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/factures" className="block h-full">
          <Card className="border-[#E5E7EB] hover-lift cursor-pointer hover:border-[#17C2D7]/40 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">Factures en attente</CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#FEF3C7]">
                <Clock className="h-4 w-4 text-[#D97706]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#111827]">{stats.facturesEnAttente}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/factures" className="block h-full">
          <Card className="border-[#E5E7EB] hover-lift cursor-pointer hover:border-[#17C2D7]/40 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-medium text-[#9CA3AF]">Montant impaye</CardTitle>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#FEE2E2]">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#DC2626]">{formatMontant(stats.facturesImpayees)}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Graphique CA vs Objectif */}
      <Card className="border-[#E5E7EB] mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-[15px] font-semibold text-[#111827]">
              Evolution du CA {currentYear}
            </CardTitle>
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              CA cumule HT{objectifAnnuel ? ' vs objectif annuel' : ''}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-[3px] rounded-full bg-[#17C2D7]" />
              <span className="text-[#6B7280]">CA cumule</span>
            </div>
            {objectifAnnuel && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-[3px] rounded-full bg-[#7C3AED] opacity-50" />
                <span className="text-[#6B7280]">Objectif</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#17C2D7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#17C2D7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="mois"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${formatCompact(v)} \u20AC`}
                  width={70}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [
                    formatMontant(Number(value) || 0),
                    name === 'caVisible' ? 'CA cumule' : 'Objectif',
                  ]}
                  labelFormatter={(label) => `${label} ${currentYear}`}
                />
                {objectifAnnuel && (
                  <Area
                    type="monotone"
                    dataKey="objectif"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeOpacity={0.5}
                    fill="none"
                    dot={false}
                    connectNulls
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="caVisible"
                  stroke="#17C2D7"
                  strokeWidth={2.5}
                  fill="url(#colorCA)"
                  dot={{ r: 3, fill: '#17C2D7', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#17C2D7', stroke: 'white', strokeWidth: 2 }}
                  connectNulls
                />
                {objectifAnnuel && (
                  <ReferenceLine
                    y={objectifAnnuel}
                    stroke="#7C3AED"
                    strokeDasharray="3 3"
                    strokeOpacity={0.3}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Derniers devis + Dernières factures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent devis */}
        <Card className="border-[#E5E7EB]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[15px] font-semibold text-[#111827]">Derniers devis</CardTitle>
            <Link
              href="/devis"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#17C2D7] hover:text-[#14a8bc] font-medium transition-colors duration-150"
            >
              Voir tout
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentDevis.length === 0 ? (
              <p className="text-[#9CA3AF] text-center py-6 text-[13px]">Aucun devis</p>
            ) : (
              <div className="space-y-1">
                {recentDevis.map((d) => (
                  <Link
                    key={d.id}
                    href={`/devis/${d.id}`}
                    className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[#F9FAFB] transition-colors duration-150"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#111827]">{d.numero}</p>
                      <p className="text-[12px] text-[#9CA3AF] truncate">{clientName(d)}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <Badge className={statutDevisConfig[d.statut]?.className || 'bg-[#F3F4F6] text-[#6B7280]'}>
                        {statutDevisConfig[d.statut]?.label || d.statut}
                      </Badge>
                      <span className="text-[13px] font-semibold text-[#111827] tabular-nums">{formatMontant(d.total_ttc)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent factures */}
        <Card className="border-[#E5E7EB]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-[15px] font-semibold text-[#111827]">Dernieres factures</CardTitle>
            <Link
              href="/factures"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#17C2D7] hover:text-[#14a8bc] font-medium transition-colors duration-150"
            >
              Voir tout
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentFactures.length === 0 ? (
              <p className="text-[#9CA3AF] text-center py-6 text-[13px]">Aucune facture</p>
            ) : (
              <div className="space-y-1">
                {recentFactures.map((f) => {
                  const restePayer = Math.max(0, Math.round(((f.solde_ttc || 0) - (f.total_paye || 0)) * 100) / 100)
                  return (
                    <Link
                      key={f.id}
                      href={`/factures/${f.id}`}
                      className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-[#F9FAFB] transition-colors duration-150"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#111827]">{f.numero}</p>
                        <p className="text-[12px] text-[#9CA3AF] truncate">{clientName(f)}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Badge className={statutFactureConfig[f.statut]?.className || 'bg-[#F3F4F6] text-[#6B7280]'}>
                          {statutFactureConfig[f.statut]?.label || f.statut}
                        </Badge>
                        <div className="text-right">
                          <span className="text-[13px] font-semibold text-[#111827] tabular-nums block">{formatMontant(f.total_ttc)}</span>
                          {f.statut !== 'payee' && f.statut !== 'brouillon' && restePayer > 0 && (
                            <span className="text-[11px] text-[#DC2626] tabular-nums">
                              Reste: {formatMontant(restePayer)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
