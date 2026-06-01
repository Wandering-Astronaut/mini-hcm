// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchDailySummaries } from '../hooks/useAttendance'
import PunchClock     from '../components/dashboard/PunchClock'
import MetricCard     from '../components/dashboard/MetricCard'
import WeeklyChart    from '../components/dashboard/WeeklyChart'
import { formatHours, to12Hour  } from '../utils/timeCompute'
import { useAttendance } from '../hooks/useAttendance'
import {
  Clock, TrendingUp, Moon, AlertTriangle,
  ArrowDown, CheckCircle2, Calendar
} from 'lucide-react'
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { getDateLabel, DEFAULT_TIMEZONE } from '../utils/timezone'

export default function DashboardPage() {
  const { profile, user } = useAuth()
  const { todayRecord } = useAttendance()
  const [weekData, setWeekData]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [todayMetrics, setTodayMetrics] = useState(null)

  useEffect(() => {
    if (!user) return

    if (todayRecord?.status === 'out') {
      if (todayRecord.metrics) setTodayMetrics(todayRecord.metrics)
      // dailySummary is written after punch-out; wait before fetching week data
      const timer = setTimeout(() => loadWeekData(), 1500)
      return () => clearTimeout(timer)
    }

    loadWeekData()
  }, [user, profile?.timezone, todayRecord?.status, todayRecord?.metrics, todayRecord?.dateLabel])

  async function loadWeekData() {
    const tz = profile?.timezone || DEFAULT_TIMEZONE
    const now = new Date()
    const from = startOfWeek(now, { weekStartsOn: 1 })
    const to = endOfWeek(now, { weekStartsOn: 1 })
    const todayKey = getDateLabel(now, tz)

    try {
      const summaries = await fetchDailySummaries(user.uid, from, to)
      const days = eachDayOfInterval({ start: from, end: to }).map(day => {
        const dateKey = getDateLabel(day, tz)
        const found = summaries.find(s => s.dateLabel === dateKey)
        const num = key => Number(found?.[key]) || 0
        return {
          day: formatInTimeZone(day, tz, 'EEE'),
          dateKey,
          isToday: dateKey === todayKey,
          regular: num('regular'),
          overtime: num('overtime'),
          nd: num('nd'),
          late: num('late'),
          undertime: num('undertime'),
          total: num('total'),
        }
      })

      // Align live attendance with the row for its dateLabel (profile timezone)
      if (todayRecord?.dateLabel && todayRecord.metrics) {
        const m = todayRecord.metrics
        const row = days.find(d => d.dateKey === todayRecord.dateLabel)
        if (row) {
          row.regular = Number(m.regular) || 0
          row.overtime = Number(m.overtime) || 0
          row.nd = Number(m.nd) || 0
          row.late = Number(m.late) || 0
          row.undertime = Number(m.undertime) || 0
          row.total = Number(m.total) || 0
        }
      }

      setWeekData(days)
      const today = days.find(d => d.isToday)
      if (today?.total > 0) {
        setTodayMetrics(today)
      } else if (todayRecord?.status === 'out' && todayRecord.metrics) {
        setTodayMetrics({
          regular: Number(todayRecord.metrics.regular) || 0,
          overtime: Number(todayRecord.metrics.overtime) || 0,
          nd: Number(todayRecord.metrics.nd) || 0,
          late: Number(todayRecord.metrics.late) || 0,
          undertime: Number(todayRecord.metrics.undertime) || 0,
          total: Number(todayRecord.metrics.total) || 0,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Weekly totals
  const weekTotals = weekData.reduce((acc, d) => ({
    regular:   acc.regular   + d.regular,
    overtime:  acc.overtime  + d.overtime,
    nd:        acc.nd        + d.nd,
    late:      acc.late      + d.late,
    undertime: acc.undertime + d.undertime,
    total:     acc.total     + d.total,
  }), { regular: 0, overtime: 0, nd: 0, late: 0, undertime: 0, total: 0 })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl font-bold text-white">
          Good {getGreeting()}, {profile?.name?.split(' ')[0]} !
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {formatInTimeZone(new Date(), profile?.timezone || DEFAULT_TIMEZONE, 'EEEE, MMMM d')} · Schedule:{' '}
          {to12Hour(profile?.schedule?.start)} – {to12Hour(profile?.schedule?.end)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column: Punch clock */}
        <div className="col-span-1 space-y-6">
          <PunchClock />

          {/* Today's metrics */}
          {todayMetrics && (
            <div className="glass-card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
                Today's Breakdown
              </p>
              <div className="space-y-2.5">
                <StatRow label="Regular"   value={formatHours(todayMetrics.regular)}   color="text-brand-400" />
                <StatRow label="Overtime"  value={formatHours(todayMetrics.overtime)}  color="text-amber-400" />
                <StatRow label="Night Diff" value={formatHours(todayMetrics.nd)}        color="text-sky-400" />
                <div className="border-t border-white/[0.06] pt-2 mt-2">
                  <StatRow label="Late"      value={formatHours(todayMetrics.late)}      color="text-rose-400" />
                  <StatRow label="Undertime" value={formatHours(todayMetrics.undertime)} color="text-orange-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right columns */}
        <div className="col-span-2 space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-3 gap-3 stagger">
            <MetricCard label="Total Hours"   value={weekTotals.total}     icon={Clock}         variant="brand"   hours sublabel="this week" />
            <MetricCard label="Overtime"      value={weekTotals.overtime}  icon={TrendingUp}    variant="warning" hours sublabel="this week" />
            <MetricCard label="Night Diff"    value={weekTotals.nd}        icon={Moon}          variant="info"    hours sublabel="this week" />
            <MetricCard label="Regular"       value={weekTotals.regular}   icon={CheckCircle2}  variant="success" hours sublabel="this week" />
            <MetricCard label="Late Arrivals" value={weekTotals.late}      icon={AlertTriangle} variant="danger"  hours sublabel="this week" />
            <MetricCard label="Undertime"     value={weekTotals.undertime} icon={ArrowDown}     variant="warning" hours sublabel="this week" />
          </div>

          {/* Weekly chart */}
          <div className="glass-card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-white">Weekly Hours</p>
                <p className="text-xs text-slate-500">Regular · Overtime · Night Diff</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-500" />Regular</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />OT</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" />ND</span>
              </div>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">Loading…</div>
            ) : (
              <WeeklyChart data={weekData} />
            )}
          </div>

          {/* Daily breakdown table */}
          <div className="glass-card p-6 animate-fade-up">
            <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-slate-500" />
              Daily Summary — This Week
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Day','Regular','OT','ND','Late','Undertime','Total'].map(h => (
                      <th key={h} className="pb-2 text-left text-slate-500 font-medium pr-4 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {weekData.map(row => (
                    <tr key={row.dateKey} className={row.isToday ? 'bg-brand-500/5' : ''}>
                      <td className={`py-2.5 pr-4 font-medium ${row.isToday ? 'text-brand-400' : 'text-slate-300'}`}>
                        {row.day} {row.isToday && <span className="text-[9px] bg-brand-600/30 text-brand-400 rounded px-1 ml-1">today</span>}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-300">{row.regular   > 0 ? formatHours(row.regular)   : '—'}</td>
                      <td className="py-2.5 pr-4 font-mono text-amber-400">{row.overtime  > 0 ? formatHours(row.overtime)  : '—'}</td>
                      <td className="py-2.5 pr-4 font-mono text-sky-400">  {row.nd        > 0 ? formatHours(row.nd)        : '—'}</td>
                      <td className="py-2.5 pr-4 font-mono text-rose-400"> {row.late      > 0 ? formatHours(row.late)      : '—'}</td>
                      <td className="py-2.5 pr-4 font-mono text-orange-400">{row.undertime > 0 ? formatHours(row.undertime) : '—'}</td>
                      <td className="py-2.5 font-mono font-semibold text-white">{row.total > 0 ? formatHours(row.total) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`font-mono text-xs font-semibold ${color}`}>{value}</span>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
