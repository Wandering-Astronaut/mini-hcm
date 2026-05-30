// src/routes/reports.js
import { Router } from 'express'
import { adminDb } from '../firebase-admin.js'
import { verifyToken, requireAdmin } from '../middleware/auth.js'
import { Timestamp } from 'firebase-admin/firestore'

const router = Router()
router.use(verifyToken, requireAdmin)

// GET /api/reports/daily?date=yyyy-MM-dd
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

// GET /api/reports/weekly?from=yyyy-MM-dd&to=yyyy-MM-dd
router.get('/weekly', async (req, res) => {
  try {
    const { from, to } = req.query
    const snap = await adminDb().collection('dailySummary')
      .where('date', '>=', Timestamp.fromDate(new Date(from)))
      .where('date', '<=', Timestamp.fromDate(new Date(to)))
      .orderBy('date', 'desc')
      .get()

    // Aggregate by employee
    const byEmployee = {}
    snap.docs.forEach(d => {
      const data = d.data()
      if (!byEmployee[data.uid]) {
        byEmployee[data.uid] = {
          uid: data.uid, userName: data.userName, email: data.email,
          regular: 0, overtime: 0, nd: 0, late: 0, undertime: 0, total: 0, days: 0
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

// PUT /api/reports/attendance/:id — admin edit punch times
router.put('/attendance/:id', async (req, res) => {
  try {
    const { punchIn, punchOut, metrics } = req.body
    await adminDb().collection('attendance').doc(req.params.id).update({
      punchIn:  Timestamp.fromDate(new Date(punchIn)),
      punchOut: Timestamp.fromDate(new Date(punchOut)),
      metrics,
    })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
