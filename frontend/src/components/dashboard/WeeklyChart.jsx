import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatHours } from '../../utils/timeCompute'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="text-white font-mono">{formatHours(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

function chartTickHours(v) {
  const n = Number(v)
  if (!n || n <= 0) return '0h'
  if (n < 1) return `${Math.round(n * 60)}m`
  return `${n.toFixed(1)}h`
}

export default function WeeklyChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
        No data for this week
      </div>
    )
  }

  const chartData = data.map(row => ({
    ...row,
    regular: Number(row.regular) || 0,
    overtime: Number(row.overtime) || 0,
    nd: Number(row.nd) || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} barGap={3} barSize={14}>
        <XAxis
          dataKey="day"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={chartTickHours}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="regular" fill="#6272f1" radius={[4, 4, 0, 0]} name="regular" />
        <Bar dataKey="overtime" fill="#f59e0b" radius={[4, 4, 0, 0]} name="overtime" />
        <Bar dataKey="nd" fill="#38bdf8" radius={[4, 4, 0, 0]} name="ND" />
      </BarChart>
    </ResponsiveContainer>
  )
}
