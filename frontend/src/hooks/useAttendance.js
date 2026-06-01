// src/hooks/useAttendance.js
import { useState, useEffect, useCallback } from 'react'
import {
  collection, query, where, orderBy,
  onSnapshot, getDocs, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { apiFetch, ApiError } from '../lib/api'
import { getDateLabel, DEFAULT_TIMEZONE } from '../utils/timezone'
import { startOfDay, endOfDay } from 'date-fns'

function punchMillis(record) {
  if (!record.punchIn) return 0
  if (typeof record.punchIn.toMillis === 'function') return record.punchIn.toMillis()
  return record.punchIn.toDate?.().getTime() ?? 0
}

function pickTodayRecord(docs) {
  if (!docs.length) return null
  const open = docs.find(d => !d.punchOut)
  if (open) return open
  return docs.sort((a, b) => punchMillis(b) - punchMillis(a))[0]
}

export function useAttendance() {
  const { user, profile } = useAuth()
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const timezone = profile?.timezone || DEFAULT_TIMEZONE

  useEffect(() => {
    if (!user) return

    const today = getDateLabel(new Date(), timezone)

    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', user.uid),
      where('dateLabel', '==', today)
    )

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setTodayRecord(pickTodayRecord(docs))
      setLoading(false)
    })

    return unsub
  }, [user, timezone])

  const punchIn = useCallback(async () => {
    if (!user || !profile) return
    if (todayRecord && !todayRecord.punchOut) return

    setActionLoading(true)
    setActionError('')
    try {
      await apiFetch('/api/attendance/punch-in', { method: 'POST' })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Punch in failed.')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [user, profile, todayRecord])

  const punchOut = useCallback(async () => {
    if (!user || !profile || !todayRecord) return

    setActionLoading(true)
    setActionError('')
    try {
      await apiFetch('/api/attendance/punch-out', {
        method: 'POST',
        body: JSON.stringify({ recordId: todayRecord.id }),
      })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Punch out failed.')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [user, profile, todayRecord])

  return { todayRecord, loading, actionLoading, actionError, punchIn, punchOut }
}

export async function fetchAttendanceRange(uid, from, to) {
  const q = query(
    collection(db, 'attendance'),
    where('uid', '==', uid),
    where('date', '>=', Timestamp.fromDate(startOfDay(from))),
    where('date', '<=', Timestamp.fromDate(endOfDay(to))),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function fetchDailySummaries(uid, from, to) {
  const q = query(
    collection(db, 'dailySummary'),
    where('uid', '==', uid),
    where('date', '>=', Timestamp.fromDate(startOfDay(from))),
    where('date', '<=', Timestamp.fromDate(endOfDay(to))),
    orderBy('date', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
