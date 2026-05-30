// src/components/dashboard/MetricCard.jsx
import clsx from 'clsx'
import { formatHours } from '../../utils/timeCompute'

const VARIANTS = {
  default:   'text-white    bg-white/[0.04]    border-white/[0.07]',
  success:   'text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/[0.18]',
  warning:   'text-amber-400   bg-amber-500/[0.08]   border-amber-500/[0.18]',
  danger:    'text-rose-400    bg-rose-500/[0.08]    border-rose-500/[0.18]',
  info:      'text-sky-400     bg-sky-500/[0.08]     border-sky-500/[0.18]',
  brand:     'text-brand-400   bg-brand-500/[0.08]   border-brand-500/[0.18]',
}

export default function MetricCard({ label, value, icon: Icon, variant = 'default', sublabel, hours = false }) {
  const display = hours ? formatHours(value) : value

  return (
    <div className={clsx(
      'rounded-xl border px-5 py-4 animate-fade-up',
      VARIANTS[variant]
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-current opacity-70">{label}</p>
        {Icon && <Icon size={14} className="opacity-50 mt-0.5" />}
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums text-current">{display ?? '—'}</p>
      {sublabel && <p className="text-[11px] mt-1 opacity-50">{sublabel}</p>}
    </div>
  )
}
