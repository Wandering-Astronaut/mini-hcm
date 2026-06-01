// src/middleware/auth.js
import { adminAuth, adminDb } from '../firebase-admin.js'


export async function verifyToken(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    const token   = header.split(' ')[1]
    const decoded = await adminAuth().verifyIdToken(token)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export async function requireAdmin(req, res, next) {
  const userDoc = await adminDb().collection('users').doc(req.user.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
