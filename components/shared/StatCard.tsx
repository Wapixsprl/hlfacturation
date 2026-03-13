import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  iconColor: string
  label: string
  value: string | number
  valueColor?: string
}

export function StatCard({ icon: Icon, iconColor, label, value, valueColor }: StatCardProps) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
        <span className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide">{label}</span>
      </div>
      <p
        className="text-lg font-bold tabular-nums"
        style={{ color: valueColor || '#111827' }}
      >
        {value}
      </p>
    </div>
  )
}
