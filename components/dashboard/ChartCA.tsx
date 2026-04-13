'use client'

import { formatMontant } from '@/lib/utils'
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

interface ChartDataPoint {
  mois: string
  objectif: number | null
  caVisible: number | null
}

interface Props {
  chartData: ChartDataPoint[]
  objectifAnnuel: number | null
  currentYear: number
}

function formatCompact(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')} M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)} k`
  return n.toFixed(0)
}

export function ChartCA({ chartData, objectifAnnuel, currentYear }: Props) {
  return (
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
            tickFormatter={(v) => `${formatCompact(v)} €`}
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
  )
}
