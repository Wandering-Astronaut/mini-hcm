// src/pages/HistoryPage.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchAttendanceRange } from '../hooks/useAttendance'
import { formatHours } from '../utils/timeCompute'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { History, Clock } from 'lucide-react'

const RANGES = [
  { label: 'This week', value: 'thisweek' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 14 days', value: '14days' },
  { label: 'Last 30 days', value: '30days' },
]

export default function HistoryPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange]     = useState('thisweek')

  useEffect(() => {
    if (!user) return
    loadRecords()
  }, [user, range])

  async function loadRecords() {
    setLoading(true)
    const now = new Date()
    let from, to = now

    switch (range) {
      case 'thisweek':
        from = startOfWeek(now, { weekStartsOn: 1 })
        to   = endOfWeek(now, { weekStartsOn: 1 })
        break
      case '7days':  from = subDays(now, 7);  break
      case '14days': from = subDays(now, 14); break
      case '30days': from = subDays(now, 30); break
    }

    try {
      const data = await fetchAttendanceRange(user.uid, from, to)
      setRecords(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <History size={22} className="text-brand-400" />
            Attendance History
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your punch-in and punch-out records</p>
        </div>

        {/* Range filter */}
        <div className="flex items-center gap-2 glass-card px-1 py-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r.value
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-16 text-center text-slate-500">Loading records…</div>
      ) : records.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Clock size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">No records found for this period.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden animate-fade-up">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Date','Punch In','Punch Out','Regular','OT','ND','Late','Undertime','Total'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {records.map(r => {
                const m = r.metrics
                return (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-200">
                      {r.punchIn ? format(r.punchIn.toDate(), 'MMM d, EEE') : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {r.punchIn ? format(r.punchIn.toDate(), 'hh:mm a') : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {r.punchOut ? format(r.punchOut.toDate(), 'hh:mm a') : (
                        <span className="text-emerald-400 text-xs font-semibold">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-brand-400 text-xs">{m ? formatHours(m.regular)   : '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-amber-400  text-xs">{m ? formatHours(m.overtime)  : '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-sky-400    text-xs">{m ? formatHours(m.nd)        : '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-rose-400   text-xs">{m ? formatHours(m.late)      : '—'}</td>
                    <td className="px-5 py-3.5 font-mono text-orange-400 text-xs">{m ? formatHours(m.undertime) : '—'}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-white text-xs">{m ? formatHours(m.total) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary totals */}
      {!loading && records.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mt-4 animate-fade-up">
          {[
            { label: 'Regular',   val: records.reduce((a,r) => a + (r.metrics?.regular   || 0), 0), color: 'text-brand-400' },
            { label: 'Overtime',  val: records.reduce((a,r) => a + (r.metrics?.overtime  || 0), 0), color: 'text-amber-400' },
            { label: 'Night Diff',val: records.reduce((a,r) => a + (r.metrics?.nd        || 0), 0), color: 'text-sky-400'   },
            { label: 'Late',      val: records.reduce((a,r) => a + (r.metrics?.late      || 0), 0), color: 'text-rose-400'  },
            { label: 'Undertime', val: records.reduce((a,r) => a + (r.metrics?.undertime || 0), 0), color: 'text-orange-400'},
          ].map(({ label, val, color }) => (
            <div key={label} className="glass-card px-4 py-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
              <p className={`font-mono text-sm font-bold ${color}`}>{formatHours(val)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
