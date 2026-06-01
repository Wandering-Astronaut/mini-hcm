import { formatInTimeZone } from 'date-fns-tz'

export const DEFAULT_TIMEZONE = 'Asia/Manila'

export function getDateLabel(date = new Date(), timezone = DEFAULT_TIMEZONE) {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd')
}

export function combineDateAndTime(baseDate, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(baseDate)
  d.setHours(h, m, 0, 0)
  return d
}

function minutesFromHhmm(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** True only for real night shifts: e.g. in at/after 5 PM, out by noon. */
function isPlausibleOvernightShift(punchInHhmm, punchOutHhmm) {
  const inMin = minutesFromHhmm(punchInHhmm)
  const outMin = minutesFromHhmm(punchOutHhmm)
  if (outMin > inMin) return false
  return inMin >= 17 * 60 && outMin <= 12 * 60
}

/**
 * Build punch in/out from HH:mm on the punch-in calendar date.
 * Both times are anchored to the same day first so 01:00 in / 12:00 AM out is invalid,
 * not silently treated as a 23-hour overnight shift.
 */
export function buildPunchTimes(record, punchInHhmm, punchOutHhmm) {
  const origIn = record.punchIn.toDate()

  const pin = combineDateAndTime(origIn, punchInHhmm)
  let pout = combineDateAndTime(origIn, punchOutHhmm)

  if (isNaN(pin.getTime()) || isNaN(pout.getTime())) {
    return { error: 'Invalid time format.' }
  }

  const outMin = minutesFromHhmm(punchOutHhmm)
  const inMin = minutesFromHhmm(punchInHhmm)

  if (outMin <= inMin) {
    if (!isPlausibleOvernightShift(punchInHhmm, punchOutHhmm)) {
      return { error: 'Punch out must be after punch in.' }
    }
    pout = new Date(pout)
    pout.setDate(pout.getDate() + 1)
  }

  if (pout <= pin) {
    return { error: 'Punch out must be after punch in.' }
  }

  const durationMs = pout - pin
  if (durationMs > 24 * 60 * 60 * 1000) {
    return { error: 'Shift cannot exceed 24 hours.' }
  }

  return { pin, pout }
}

export function validatePunchEdit(record, punchInHhmm, punchOutHhmm) {
  if (!punchInHhmm || !punchOutHhmm) {
    return 'Punch in and punch out times are required.'
  }
  const built = buildPunchTimes(record, punchInHhmm, punchOutHhmm)
  return built.error || ''
}
