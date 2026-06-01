// src/routes/attendance.js
import { Router } from 'express'
import { adminDb } from '../firebase-admin.js'
import { verifyToken } from '../middleware/auth.js'
import { computeAttendanceMetrics } from '../utils/timeCompute.js'
import { upsertDailySummary } from '../utils/dailySummary.js'
import { Timestamp } from 'firebase-admin/firestore'
import { formatInTimeZone } from 'date-fns-tz'

const router = Router()
router.use(verifyToken)

const DEFAULT_TIMEZONE = 'Asia/Manila'

function dateLabel(now, timezone) {
  return formatInTimeZone(now, timezone, 'yyyy-MM-dd')
}

router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query
    let q = adminDb().collection('attendance').where('uid', '==', req.user.uid)
    if (from) q = q.where('date', '>=', Timestamp.fromDate(new Date(from)))
    if (to)   q = q.where('date', '<=', Timestamp.fromDate(new Date(to)))
    q = q.orderBy('date', 'desc').limit(100)

    const snap = await q.get()
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/punch-in', async (req, res) => {
  try {
    const userDoc = await adminDb().collection('users').doc(req.user.uid).get()
    if (!userDoc.exists) return res.status(404).json({ error: 'User profile not found' })

    const profile  = userDoc.data()
    const timezone = profile.timezone || DEFAULT_TIMEZONE
    const now      = new Date()
    const today    = dateLabel(now, timezone)

    const existing = await adminDb().collection('attendance')
      .where('uid', '==', req.user.uid)
      .where('dateLabel', '==', today)
      .get()

    const open = existing.docs.find(d => !d.data().punchOut)
    if (open) {
      return res.status(409).json({ error: 'Already punched in for today' })
    }

    const ref = await adminDb().collection('attendance').add({
      uid:       req.user.uid,
      userName:  profile.name,
      email:     profile.email,
      date:      Timestamp.fromDate(now),
      punchIn:   Timestamp.fromDate(now),
      punchOut:  null,
      dateLabel: today,
      metrics:   null,
      schedule:  profile.schedule,
      status:    'in',
    })

    res.json({ id: ref.id, punchIn: now.toISOString() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/punch-out', async (req, res) => {
  try {
    const { recordId } = req.body
    if (!recordId) return res.status(400).json({ error: 'recordId is required' })

    const recDoc = await adminDb().collection('attendance').doc(recordId).get()
    if (!recDoc.exists) return res.status(404).json({ error: 'Record not found' })

    const record = recDoc.data()
    if (record.uid !== req.user.uid) {
      return res.status(403).json({ error: 'Not allowed to modify this record' })
    }
    if (record.punchOut) {
      return res.status(409).json({ error: 'Already punched out' })
    }

    const userDoc = await adminDb().collection('users').doc(req.user.uid).get()
    const profile = userDoc.data()
    const timezone = profile.timezone || DEFAULT_TIMEZONE
    const schedule = profile.schedule || { start: '09:00', end: '18:00' }

    const now     = new Date()
    const punchIn = record.punchIn.toDate()
    const metrics = computeAttendanceMetrics(
      punchIn,
      now,
      schedule.start,
      schedule.end
    )

    await adminDb().collection('attendance').doc(recordId).update({
      punchOut: Timestamp.fromDate(now),
      metrics,
      status: 'out',
    })

    const label = record.dateLabel || dateLabel(now, timezone)
    await upsertDailySummary(req.user.uid, profile, label, metrics, timezone)

    res.json({ punchOut: now.toISOString(), metrics })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
