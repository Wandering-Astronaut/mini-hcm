// src/routes/reports.js
import { Router } from 'express'
import { adminDb } from '../firebase-admin.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'
import { computeAttendanceMetrics } from '../utils/timeCompute.js'
import { upsertDailySummary } from '../utils/dailySummary.js'
import { buildPunchTimes } from '../utils/punchTimes.js'
import { Timestamp } from 'firebase-admin/firestore'
import { format } from 'date-fns'

const router = Router()
router.use(verifyToken, requireAdmin)

router.get('/daily', async (req, res) => {
  try {
    const { date } = req.query
    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd   = new Date(`${date}T23:59:59`)

    const snap = await adminDb().collection('attendance')
      .where('date', '>=', Timestamp.fromDate(dayStart))
      .where('date', '<=', Timestamp.fromDate(dayEnd))
      .orderBy('date', 'desc')
      .get()

    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/weekly', async (req, res) => {
  try {
    const { from, to } = req.query
    const snap = await adminDb().collection('dailySummary')
      .where('date', '>=', Timestamp.fromDate(new Date(from)))
      .where('date', '<=', Timestamp.fromDate(new Date(to)))
      .orderBy('date', 'desc')
      .get()

    const byEmployee = {}
    snap.docs.forEach(d => {
      const data = d.data()
      if (!byEmployee[data.uid]) {
        byEmployee[data.uid] = {
          uid: data.uid, userName: data.userName, email: data.email,
          regular: 0, overtime: 0, nd: 0, late: 0, undertime: 0, total: 0, days: 0,
        }
      }
      const emp = byEmployee[data.uid]
      emp.regular   += data.regular   || 0
      emp.overtime  += data.overtime  || 0
      emp.nd        += data.nd        || 0
      emp.late      += data.late      || 0
      emp.undertime += data.undertime || 0
      emp.total     += data.total     || 0
      emp.days++
    })

    res.json(Object.values(byEmployee))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/reports/attendance/:id — admin edit (server computes metrics)
router.put('/attendance/:id', async (req, res) => {
  try {
    const { punchInHhmm, punchOutHhmm } = req.body
    if (!punchInHhmm || !punchOutHhmm) {
      return res.status(400).json({ error: 'punchInHhmm and punchOutHhmm are required' })
    }

    const recDoc = await adminDb().collection('attendance').doc(req.params.id).get()
    if (!recDoc.exists) return res.status(404).json({ error: 'Record not found' })

    const record = recDoc.data()
    const built = buildPunchTimes(
      { punchIn: record.punchIn, punchOut: record.punchOut },
      punchInHhmm,
      punchOutHhmm
    )
    if (built.error) return res.status(400).json({ error: built.error })

    const { pin, pout } = built

    const userDoc = await adminDb().collection('users').doc(record.uid).get()
    const profile = userDoc.data() || {}
    const schedule = profile.schedule || { start: '09:00', end: '18:00' }
    const metrics = computeAttendanceMetrics(pin, pout, schedule.start, schedule.end)

    await adminDb().collection('attendance').doc(req.params.id).update({
      punchIn:  Timestamp.fromDate(pin),
      punchOut: Timestamp.fromDate(pout),
      metrics,
      status: 'out',
    })

    const dateLabel = record.dateLabel || format(pin, 'yyyy-MM-dd')
    await upsertDailySummary(
      record.uid,
      {
        name: profile.name || record.userName,
        email: profile.email || record.email,
        timezone: profile.timezone,
      },
      dateLabel,
      metrics,
      profile.timezone
    )

    res.json({ success: true, metrics })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
