// src/hooks/useAttendance.js
import { useState, useEffect, useCallback } from 'react'
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, doc, updateDoc, serverTimestamp, getDoc, getDocs, Timestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'
import { computeAttendanceMetrics } from '../utils/timeCompute'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'

export function useAttendance() {
  const { user, profile } = useAuth()
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Subscribe to today's attendance record
  useEffect(() => {
    if (!user) return

    const today = format(new Date(), 'yyyy-MM-dd')

    const q = query(
      collection(db, 'attendance'),
      where('uid', '==', user.uid),
      where('dateLabel', '==', today)
    )

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0]
        setTodayRecord({ id: d.id, ...d.data() })
      } else {
        setTodayRecord(null)
      }
      setLoading(false)
    })

    return unsub
  }, [user])

  const punchIn = useCallback(async () => {
    if (!user || !profile) return
    setActionLoading(true)
    try {
      const now = new Date()
      await addDoc(collection(db, 'attendance'), {
        uid:       user.uid,
        userName:  profile.name,
        email:     profile.email,
        date:      Timestamp.fromDate(now),
        punchIn:   Timestamp.fromDate(now),
        punchOut:  null,
        dateLabel: format(now, 'yyyy-MM-dd'),
        metrics:   null,
        schedule:  profile.schedule,
        status:    'in',
      })
    } finally {
      setActionLoading(false)
    }
  }, [user, profile])

  const punchOut = useCallback(async () => {
    if (!user || !profile || !todayRecord) return
    setActionLoading(true)
    try {
      const now     = new Date()
      const punchIn = todayRecord.punchIn.toDate()
      const metrics = computeAttendanceMetrics(
        punchIn,
        now,
        profile.schedule.start,
        profile.schedule.end
      )

      const ref = doc(db, 'attendance', todayRecord.id)
      await updateDoc(ref, {
        punchOut: Timestamp.fromDate(now),
        metrics,
        status: 'out',
      })

      // Upsert daily summary
      await upsertDailySummary(user.uid, profile, format(now, 'yyyy-MM-dd'), metrics, now)
    } finally {
      setActionLoading(false)
    }
  }, [user, profile, todayRecord])

  return { todayRecord, loading, actionLoading, punchIn, punchOut }
}

async function upsertDailySummary(uid, profile, dateLabel, metrics, date) {
  const summaryId = `${uid}_${dateLabel}`
  const ref       = doc(db, 'dailySummary', summaryId)
  const snap      = await getDoc(ref)

  const payload = {
    uid,
    userName:  profile.name,
    email:     profile.email,
    dateLabel,
    date:      Timestamp.fromDate(startOfDay(date)),
    ...metrics,
    updatedAt: serverTimestamp(),
  }

  if (snap.exists()) {
    await updateDoc(ref, payload)
  } else {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(ref, { ...payload, createdAt: serverTimestamp() })
  }
}

/**
 * Fetch attendance history for a user within a date range
 */
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

/**
 * Fetch daily summaries for a user in a date range
 */
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
