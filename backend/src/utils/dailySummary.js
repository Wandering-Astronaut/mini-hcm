import { adminDb } from '../firebase-admin.js'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { fromZonedTime } from 'date-fns-tz'

const DEFAULT_TIMEZONE = 'Asia/Manila'

/** Firestore `date` field aligned to dateLabel in the user's timezone */
function dateFromLabel(dateLabel, timezone = DEFAULT_TIMEZONE) {
  return fromZonedTime(`${dateLabel}T12:00:00`, timezone)
}

export async function upsertDailySummary(uid, profile, dateLabel, metrics, timezone) {
  const summaryId = `${uid}_${dateLabel}`
  const ref = adminDb().collection('dailySummary').doc(summaryId)
  const snap = await ref.get()
  const tz = timezone || profile.timezone || DEFAULT_TIMEZONE

  const payload = {
    uid,
    userName: profile.name,
    email: profile.email,
    dateLabel,
    date: Timestamp.fromDate(dateFromLabel(dateLabel, tz)),
    ...metrics,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (snap.exists) {
    await ref.update(payload)
  } else {
    await ref.set({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    })
  }
}
