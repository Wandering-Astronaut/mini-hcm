// src/routes/attendance.js
import { Router } from 'express'
import { adminDb } from '../firebase-admin.js'
import { verifyToken } from '../middleware/auth.js'
import { computeAttendanceMetrics } from '../utils/timeCompute.js'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { format } from 'date-fns'

const router = Router()
router.use(verifyToken)

// GET /api/attendance — fetch records for authenticated user
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query
    let q = adminDb().collection('attendance').where('uid', '==', req.user.uid)
    if (from) q = q.where('date', '>=', new Date(from))
    if (to)   q = q.where('date', '<=', new Date(to))
    q = q.orderBy('date', 'desc').limit(100)

    const snap = await q.get()
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/attendance/punch-in
router.post('/punch-in', async (req, res) => {
  try {
    const userDoc  = await adminDb().collection('users').doc(req.user.uid).get()
    const profile  = userDoc.data()
    const now      = new Date()

    const ref = await adminDb().collection('attendance').add({
      uid:       req.user.uid,
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

    res.json({ id: ref.id, punchIn: now })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/attendance/punch-out
router.post('/punch-out', async (req, res) => {
  try {
    const { recordId } = req.body
    const recDoc = await adminDb().collection('attendance').doc(recordId).get()
    if (!recDoc.exists) return res.status(404).json({ error: 'Record not found' })

    const record  = recDoc.data()
    const userDoc = await adminDb().collection('users').doc(req.user.uid).get()
    const profile = userDoc.data()

    const now     = new Date()
    const punchIn = record.punchIn.toDate()
    const metrics = computeAttendanceMetrics(punchIn, now, profile.schedule.start, profile.schedule.end)

    await adminDb().collection('attendance').doc(recordId).update({
      punchOut: Timestamp.fromDate(now),
      metrics,
      status: 'out',
    })

    res.json({ punchOut: now, metrics })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
