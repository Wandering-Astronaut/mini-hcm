// src/firebase-admin.js
import admin from 'firebase-admin'
import { readFileSync } from 'fs'

let initialized = false

export function initFirebaseAdmin() {
  if (initialized) return
  const serviceAccount = JSON.parse(
    readFileSync(new URL('../service-account.json', import.meta.url))
  )
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
  initialized = true
}

export const adminDb   = () => admin.firestore()
export const adminAuth = () => admin.auth()
export default admin
