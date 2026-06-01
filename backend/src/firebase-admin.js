// src/firebase-admin.js
import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

let initialized = false

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }

  const fromEnvPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (fromEnvPath && existsSync(fromEnvPath)) {
    return JSON.parse(readFileSync(fromEnvPath, 'utf8'))
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const localPath = path.join(__dirname, '../service-account.json')

  if (existsSync(localPath)) {
    return JSON.parse(readFileSync(localPath, 'utf8'))
  }

  throw new Error(
    'Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT (JSON string) on Render, ' +
      'or place service-account.json in backend/ for local dev.'
  )
}

export function initFirebaseAdmin() {
  if (initialized) return

  const serviceAccount = loadServiceAccount()

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  initialized = true
}

export const adminDb = () => admin.firestore()
export const adminAuth = () => admin.auth()
export default admin
