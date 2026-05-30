// src/components/dashboard/PunchClock.jsx
import { useState, useEffect } from 'react'
import { useAttendance } from '../../hooks/useAttendance'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { Clock, LogIn, LogOut, Loader2, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

export default function PunchClock() {
  const { profile } = useAuth()
  const { todayRecord, loading, actionLoading, punchIn, punchOut } = useAttendance()
  const [now, setNow] = useState(new Date())
  const [elapsed, setElapsed] = useState('00:00:00')

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Elapsed time counter
  useEffect(() => {
    if (!todayRecord?.punchIn || todayRecord?.punchOut) return
    const id = setInterval(() => {
      const diff = Date.now() - todayRecord.punchIn.toDate().getTime()
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(id)
  }, [todayRecord])

  const isPunchedIn  = !!todayRecord?.punchIn && !todayRecord?.punchOut
  const isPunchedOut = !!todayRecord?.punchOut

  const statusColor = isPunchedIn
    ? 'text-emerald-400'
    : isPunchedOut
    ? 'text-brand-400'
    : 'text-slate-500'

  const statusLabel = isPunchedIn
    ? 'On Shift'
    : isPunchedOut
    ? 'Completed'
    : 'Off Shift'

  return (
    <div className="glass-card p-8 flex flex-col items-center text-center">
      {/* Live clock */}
      <p className="font-mono text-5xl font-medium text-white tracking-tight tabular-nums mb-1">
        {format(now, 'HH:mm:ss')}
      </p>
      <p className="text-sm text-slate-400 mb-6">{format(now, 'EEEE, MMMM d, yyyy')}</p>

      {/* Status badge */}
      <div className={clsx(
        'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-8 border',
        isPunchedIn
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
          : isPunchedOut
          ? 'bg-brand-500/10 border-brand-500/25 text-brand-400'
          : 'bg-slate-700/30 border-slate-700/50 text-slate-500'
      )}>
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          isPunchedIn ? 'bg-emerald-400 animate-pulse-dot' : isPunchedOut ? 'bg-brand-400' : 'bg-slate-600'
        )} />
        {statusLabel}
      </div>

      {/* Punch button */}
      {!loading && !isPunchedOut && (
        <button
          onClick={isPunchedIn ? punchOut : punchIn}
          disabled={actionLoading}
          className={clsx(
            'relative w-32 h-32 rounded-full flex flex-col items-center justify-center gap-2',
            'text-white font-semibold text-sm transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isPunchedIn
              ? 'bg-rose-600 hover:bg-rose-500 shadow-xl shadow-rose-900/40 active:scale-95'
              : 'bg-brand-600 hover:bg-brand-500 shadow-xl shadow-brand-900/50 active:scale-95 punch-ring'
          )}
        >
          {actionLoading
            ? <Loader2 size={28} className="animate-spin" />
            : isPunchedIn
            ? <><LogOut size={28} /><span>Punch Out</span></>
            : <><LogIn size={28} /><span>Punch In</span></>
          }
        </button>
      )}

      {isPunchedOut && (
        <div className="w-32 h-32 rounded-full bg-brand-600/10 border-2 border-brand-500/30 flex flex-col items-center justify-center gap-2 text-brand-400">
          <CheckCircle size={32} />
          <span className="text-xs font-semibold">Done Today</span>
        </div>
      )}

      {/* Elapsed time */}
      {isPunchedIn && (
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">Time on clock</p>
          <p className="font-mono text-2xl text-emerald-400 font-medium tabular-nums">{elapsed}</p>
        </div>
      )}

      {/* Punch times */}
      {todayRecord && (
        <div className="mt-6 grid grid-cols-2 gap-4 w-full text-center">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Punched In</p>
            <p className="font-mono text-sm text-white">
              {todayRecord.punchIn ? format(todayRecord.punchIn.toDate(), 'hh:mm a') : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Punched Out</p>
            <p className="font-mono text-sm text-white">
              {todayRecord.punchOut ? format(todayRecord.punchOut.toDate(), 'hh:mm a') : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Schedule reminder */}
      {profile?.schedule && (
        <p className="mt-4 text-xs text-slate-600">
          Schedule: {profile.schedule.start} – {profile.schedule.end}
        </p>
      )}
    </div>
  )
}
