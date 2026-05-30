// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react'
import {
  collection, query, orderBy, getDocs, where,
  doc, updateDoc, Timestamp, getDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatHours, computeAttendanceMetrics } from '../utils/timeCompute'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import {
  ShieldCheck, Users, ChevronDown, ChevronUp,
  Edit3, Check, X, RefreshCw, Calendar
} from 'lucide-react'
import clsx from 'clsx'

export default function AdminPage() {
  const [employees, setEmployees]   = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading]       = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [editRow, setEditRow]       = useState(null)
  const [editTimes, setEditTimes]   = useState({ punchIn: '', punchOut: '' })
  const [activeTab, setActiveTab]   = useState('daily')

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 })

  useEffect(() => { loadData() }, [weekOffset])

  async function loadData() {
    setLoading(true)
    try {
      // Load all employees
      const usersSnap = await getDocs(collection(db, 'users'))
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEmployees(users)

      // Load attendance for the selected week
      const q = query(
        collection(db, 'attendance'),
        where('date', '>=', Timestamp.fromDate(weekStart)),
        where('date', '<=', Timestamp.fromDate(weekEnd)),
        orderBy('date', 'desc')
      )
      const snap = await getDocs(q)
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally {
      setLoading(false)
    }
  }

  async function saveEdit(record) {
    const pin  = new Date(`${format(record.punchIn.toDate(), 'yyyy-MM-dd')}T${editTimes.punchIn}`)
    const pout = new Date(`${format(record.punchIn.toDate(), 'yyyy-MM-dd')}T${editTimes.punchOut}`)

    // Get user schedule
    const userDoc = await getDoc(doc(db, 'users', record.uid))
    const schedule = userDoc.data()?.schedule || { start: '09:00', end: '18:00' }
    const metrics  = computeAttendanceMetrics(pin, pout, schedule.start, schedule.end)

    await updateDoc(doc(db, 'attendance', record.id), {
      punchIn:  Timestamp.fromDate(pin),
      punchOut: Timestamp.fromDate(pout),
      metrics,
    })
    setEditRow(null)
    await loadData()
  }

  // Group attendance by employee for weekly report
  const weeklyByEmployee = employees.map(emp => {
    const recs = attendance.filter(r => r.uid === emp.uid || r.uid === emp.id)
    const totals = recs.reduce((acc, r) => ({
      regular:   acc.regular   + (r.metrics?.regular   || 0),
      overtime:  acc.overtime  + (r.metrics?.overtime  || 0),
      nd:        acc.nd        + (r.metrics?.nd        || 0),
      late:      acc.late      + (r.metrics?.late      || 0),
      undertime: acc.undertime + (r.metrics?.undertime || 0),
      total:     acc.total     + (r.metrics?.total     || 0),
      days:      acc.days + (r.punchOut ? 1 : 0),
    }), { regular: 0, overtime: 0, nd: 0, late: 0, undertime: 0, total: 0, days: 0 })
    return { ...emp, ...totals, records: recs }
  }).filter(e => e.role !== 'admin')

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheck size={22} className="text-brand-400" />
            Admin Panel
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(w => w + 1)} className="btn-secondary py-2 px-3">
            <ChevronDown size={15} />
          </button>
          <span className="text-sm text-slate-400 w-20 text-center">
            {weekOffset === 0 ? 'This week' : `${weekOffset}w ago`}
          </span>
          <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0} className="btn-secondary py-2 px-3">
            <ChevronUp size={15} />
          </button>
          <button onClick={loadData} className="btn-secondary py-2 px-3">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-card p-1 mb-6 w-fit animate-fade-up">
        {[
          { key: 'daily',  label: 'Daily Records' },
          { key: 'weekly', label: 'Weekly Report' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={clsx(
              'px-5 py-2 rounded-xl text-sm font-semibold transition-all',
              activeTab === t.key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily Records Tab */}
      {activeTab === 'daily' && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Employee','Date','Punch In','Punch Out','Regular','OT','ND','Late','UT','Total','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-600">Loading…</td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-600">No records this week</td></tr>
              ) : attendance.map(r => {
                const isEdit = editRow === r.id
                const m = r.metrics
                return (
                  <tr key={r.id} className={clsx('hover:bg-white/[0.02]', isEdit && 'bg-brand-500/5')}>
                    <td className="px-4 py-3 font-medium text-slate-200">{r.userName || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {r.punchIn ? format(r.punchIn.toDate(), 'MMM d') : '—'}
                    </td>
                    {isEdit ? (
                      <>
                        <td className="px-4 py-3">
                          <input type="time" value={editTimes.punchIn}
                            onChange={e => setEditTimes(t => ({...t, punchIn: e.target.value}))}
                            className="input-field py-1 text-xs w-28"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input type="time" value={editTimes.punchOut}
                            onChange={e => setEditTimes(t => ({...t, punchOut: e.target.value}))}
                            className="input-field py-1 text-xs w-28"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {r.punchIn ? format(r.punchIn.toDate(), 'hh:mm a') : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {r.punchOut ? format(r.punchOut.toDate(), 'hh:mm a') : (
                            <span className="text-emerald-400 font-semibold">Active</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 font-mono text-brand-400">{m ? formatHours(m.regular)   : '—'}</td>
                    <td className="px-4 py-3 font-mono text-amber-400">{m ? formatHours(m.overtime)  : '—'}</td>
                    <td className="px-4 py-3 font-mono text-sky-400">  {m ? formatHours(m.nd)        : '—'}</td>
                    <td className="px-4 py-3 font-mono text-rose-400"> {m ? formatHours(m.late)      : '—'}</td>
                    <td className="px-4 py-3 font-mono text-orange-400">{m ? formatHours(m.undertime) : '—'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">{m ? formatHours(m.total) : '—'}</td>
                    <td className="px-4 py-3">
                      {isEdit ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(r)} className="btn-primary text-[10px] py-1 px-2">
                            <Check size={11} />
                          </button>
                          <button onClick={() => setEditRow(null)} className="btn-secondary text-[10px] py-1 px-2">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditRow(r.id)
                            setEditTimes({
                              punchIn:  r.punchIn  ? format(r.punchIn.toDate(),  'HH:mm') : '',
                              punchOut: r.punchOut ? format(r.punchOut.toDate(), 'HH:mm') : '',
                            })
                          }}
                          className="btn-secondary text-[10px] py-1 px-2"
                        >
                          <Edit3 size={11} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Weekly Report Tab */}
      {activeTab === 'weekly' && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {['Employee','Email','Days','Regular','OT','ND','Late','Undertime','Total'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-600">Loading…</td></tr>
              ) : weeklyByEmployee.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-600">No employees found</td></tr>
              ) : weeklyByEmployee.map(emp => (
                <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-white">{emp.name}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{emp.email}</td>
                  <td className="px-5 py-3.5 text-slate-300 font-mono">{emp.days}</td>
                  <td className="px-5 py-3.5 font-mono text-brand-400 text-xs">{formatHours(emp.regular)}</td>
                  <td className="px-5 py-3.5 font-mono text-amber-400  text-xs">{formatHours(emp.overtime)}</td>
                  <td className="px-5 py-3.5 font-mono text-sky-400    text-xs">{formatHours(emp.nd)}</td>
                  <td className="px-5 py-3.5 font-mono text-rose-400   text-xs">{formatHours(emp.late)}</td>
                  <td className="px-5 py-3.5 font-mono text-orange-400 text-xs">{formatHours(emp.undertime)}</td>
                  <td className="px-5 py-3.5 font-mono font-bold text-white text-xs">{formatHours(emp.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
