// src/index.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initFirebaseAdmin } from './firebase-admin.js'
import attendanceRoutes from './routes/attendance.js'
import reportsRoutes    from './routes/reports.js'

dotenv.config()

initFirebaseAdmin()

const app  = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(express.json())

app.use('/api/attendance', attendanceRoutes)
app.use('/api/reports',    reportsRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => console.log(`HCM API running on :${PORT}`))
