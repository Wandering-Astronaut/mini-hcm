// src/pages/AdminPage.jsx
import { useState, useEffect, Fragment } from 'react'
import {
  collection, query, orderBy, getDocs, where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { apiFetch, ApiError } from '../lib/api'
import { formatHours } from '../utils/timeCompute'
import { buildPunchTimes, validatePunchEdit } from '../utils/timezone'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import {
  ShieldCheck, ChevronDown, ChevronUp,
  Edit3, Check, X, RefreshCw, AlertCircle
} from 'lucide-react'
import clsx from 'clsx'
import ScheduleTimePicker from '../components/shared/ScheduleTimePicker'

export default function AdminPage() {
  const [employees, setEmployees]     = useState([])
  const [attendance, setAttendance]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [weekOffset, setWeekOffset]   = useState(0)
  const [editRow, setEditRow]         = useState(null)
  const [editTimes, setEditTimes]     = useState({ punchIn: '', punchOut: '' })
  const [editError, setEditError]     = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [activeTab, setActiveTab]     = useState('daily')

  
  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 })

  useEffect(() => { loadData() }, [weekOffset])

  async function loadData() {
    setLoading(true)
    try {
      const usersSnap = await getDocs(collection(db, 'users'))
      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEmployees(users)

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

  function applyEditTimes(record, patch) {
    setEditTimes(prev => {
      const next = { ...prev, ...patch }
      setEditError(validatePunchEdit(record, next.punchIn, next.punchOut))
      return next
    })
  }

  async function saveEdit(record) {
    const err = validatePunchEdit(record, editTimes.punchIn, editTimes.punchOut)
    if (err) {
      setEditError(err)
      return
    }

    const built = buildPunchTimes(record, editTimes.punchIn, editTimes.punchOut)
    if (built.error) {
      setEditError(built.error)
      return
    }

    setSaveLoading(true)
    try {
      await apiFetch(`/api/reports/attendance/${record.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          punchInHhmm: editTimes.punchIn,
          punchOutHhmm: editTimes.punchOut,
        }),
      })

      setEditRow(null)
      setEditError('')
      await loadData()
    } catch (err) {
      setEditError(
        err instanceof ApiError ? err.message : 'Failed to save. Please try again.'
      )
    } finally {
      setSaveLoading(false)
    }
  }

  function startEdit(r) {
    const times = {
      punchIn: r.punchIn ? format(r.punchIn.toDate(), 'HH:mm') : '',
      punchOut: r.punchOut ? format(r.punchOut.toDate(), 'HH:mm') : '',
    }
    setEditRow(r.id)
    setEditTimes(times)
    setEditError(validatePunchEdit(r, times.punchIn, times.punchOut))
  }

  function cancelEdit() {
    setEditRow(null)
    setEditError('')
  }

  // Fixed: use emp.uid || emp.id and filter admin correctly
  const weeklyByEmployee = employees
    .filter(e => e.role !== 'admin')
    .map(emp => {
      const uid  = emp.uid || emp.id
      const recs = attendance.filter(r => r.uid === uid)
      const totals = recs.reduce((acc, r) => ({
        regular:   acc.regular   + (r.metrics?.regular   || 0),
        overtime:  acc.overtime  + (r.metrics?.overtime  || 0),
        nd:        acc.nd        + (r.metrics?.nd        || 0),
        late:      acc.late      + (r.metrics?.late      || 0),
        undertime: acc.undertime + (r.metrics?.undertime || 0),
        total:     acc.total     + (r.metrics?.total     || 0),
        days:      acc.days      + (r.punchOut ? 1 : 0),
      }), { regular: 0, overtime: 0, nd: 0, late: 0, undertime: 0, total: 0, days: 0 })
      return { ...emp, ...totals }
    })

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
        <div className="glass-card overflow-x-auto animate-fade-in">
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
                  <Fragment key={r.id}>
                    <tr className={clsx('hover:bg-white/[0.02]', isEdit && 'bg-brand-500/5')}>
                      <td className="px-4 py-3 font-medium text-slate-200">{r.userName || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {r.punchIn ? format(r.punchIn.toDate(), 'MMM d') : '—'}
                      </td>

                      {isEdit ? (
                        <>
                          <td className="px-4 py-3">
                            <ScheduleTimePicker
                              value={editTimes.punchIn}
                              onChange={v => applyEditTimes(r, { punchIn: v })}
                              buttonClassName="py-1.5 text-xs min-w-[8.5rem]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <ScheduleTimePicker
                              value={editTimes.punchOut}
                              onChange={v => applyEditTimes(r, { punchOut: v })}
                              buttonClassName="py-1.5 text-xs min-w-[8.5rem]"
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

                      <td className="px-4 py-3 font-mono text-brand-400">{!isEdit && m ? formatHours(m.regular)   : '—'}</td>
                      <td className="px-4 py-3 font-mono text-amber-400">{!isEdit && m ? formatHours(m.overtime)  : '—'}</td>
                      <td className="px-4 py-3 font-mono text-sky-400">  {!isEdit && m ? formatHours(m.nd)        : '—'}</td>
                      <td className="px-4 py-3 font-mono text-rose-400"> {!isEdit && m ? formatHours(m.late)      : '—'}</td>
                      <td className="px-4 py-3 font-mono text-orange-400">{!isEdit && m ? formatHours(m.undertime) : '—'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white">{!isEdit && m ? formatHours(m.total) : '—'}</td>
                      <td className="px-4 py-3">
                        {isEdit ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(r)}
                              disabled={saveLoading || !!editError}
                              className="btn-primary text-[10px] py-1 px-2"
                            >
                              <Check size={11} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="btn-secondary text-[10px] py-1 px-2"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(r)}
                            className="btn-secondary text-[10px] py-1 px-2"
                          >
                            <Edit3 size={11} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Validation error row — shows below the row being edited */}
                    {isEdit && editError && (
                      <tr key={`${r.id}-error`} className="bg-rose-500/5">
                        <td colSpan={11} className="px-4 py-2">
                          <div className="flex items-center gap-2 text-xs text-rose-400">
                            <AlertCircle size={12} />
                            {editError}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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