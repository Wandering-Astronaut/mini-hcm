// src/utils/timeCompute.js
// Core HCM computation logic — OT, ND, Late, Undertime, Regular hours

/**
 * Parse "HH:MM" string into { hours, minutes }
 */
export function parseTime(str) {
  const [h, m] = str.split(':').map(Number)
  return { hours: h, minutes: m }
}

/**
 * Convert "HH:MM" to total minutes from midnight
 */
export function toMinutes(str) {
  const { hours, minutes } = parseTime(str)
  return hours * 60 + minutes
}

/**
 * Format decimal hours → "Xh Ym"
 */
export function formatHours(decimalHours) {
  if (!decimalHours || decimalHours <= 0) return '0h 0m'
  const h = Math.floor(decimalHours)
  const m = Math.round((decimalHours - h) * 60)
  return `${h}h ${m}m`
}

/**
 * Night Differential window: 22:00 – 06:00 (next day)
 * Returns ND minutes within [start, end] range (both as Date objects)
 */
export function computeNDMinutes(punchIn, punchOut) {
  let nd = 0
  let cursor = new Date(punchIn)

  while (cursor < punchOut) {
    const hour = cursor.getHours()
    // ND hours: 22, 23, 0, 1, 2, 3, 4, 5
    if (hour >= 22 || hour < 6) {
      nd++
    }
    cursor = new Date(cursor.getTime() + 60 * 1000) // advance 1 minute
  }
  return nd
}

/**
 * Main computation function.
 * @param {Date}   punchIn     - Punch-in timestamp
 * @param {Date}   punchOut    - Punch-out timestamp
 * @param {string} shiftStart  - "HH:MM" e.g. "09:00"
 * @param {string} shiftEnd    - "HH:MM" e.g. "18:00"
 * @returns {object} metrics in decimal hours
 */
export function computeAttendanceMetrics(punchIn, punchOut, shiftStart, shiftEnd) {
  const dateRef = new Date(punchIn)
  dateRef.setSeconds(0, 0)

  // Build scheduled start/end as Date objects on the same calendar day
  const [ssH, ssM] = shiftStart.split(':').map(Number)
  const [seH, seM] = shiftEnd.split(':').map(Number)

  const schedStart = new Date(dateRef)
  schedStart.setHours(ssH, ssM, 0, 0)

  const schedEnd = new Date(dateRef)
  schedEnd.setHours(seH, seM, 0, 0)
  // Handle overnight shifts
  if (schedEnd <= schedStart) schedEnd.setDate(schedEnd.getDate() + 1)

  const scheduledMinutes = (schedEnd - schedStart) / 60000

  // --- Late ---
  const lateMinutes = Math.max(0, (punchIn - schedStart) / 60000)

  // --- Undertime ---
  // Undertime only if employee leaves before scheduled end
  const undertimeMinutes = punchOut < schedEnd
    ? Math.max(0, (schedEnd - punchOut) / 60000)
    : 0

  // --- Total worked minutes ---
  const workedMinutes = Math.max(0, (punchOut - punchIn) / 60000)

  // --- Regular hours ---
  // Regular = worked time within the scheduled window, minus late deduction
  const effectiveStart = punchIn > schedStart ? punchIn : schedStart
  const effectiveEnd   = punchOut < schedEnd   ? punchOut : schedEnd
  const regularMinutes = Math.max(0, (effectiveEnd - effectiveStart) / 60000)

  // --- Overtime ---
  // OT = time worked beyond scheduled end
  const otMinutes = punchOut > schedEnd
    ? Math.max(0, (punchOut - schedEnd) / 60000)
    : 0

  // --- Night Differential ---
  const ndMinutes = computeNDMinutes(punchIn, punchOut)

  return {
    regular:   +(regularMinutes / 60).toFixed(4),
    overtime:  +(otMinutes      / 60).toFixed(4),
    nd:        +(ndMinutes       / 60).toFixed(4),
    late:      +(lateMinutes     / 60).toFixed(4),
    undertime: +(undertimeMinutes/ 60).toFixed(4),
    total:     +(workedMinutes   / 60).toFixed(4),
    scheduled: +(scheduledMinutes/ 60).toFixed(4),
  }
}

/**
 * Aggregate an array of daily metrics into weekly totals
 */
export function aggregateWeekly(dailyMetrics) {
  return dailyMetrics.reduce((acc, day) => ({
    regular:   +(acc.regular   + (day.regular   || 0)).toFixed(4),
    overtime:  +(acc.overtime  + (day.overtime  || 0)).toFixed(4),
    nd:        +(acc.nd        + (day.nd        || 0)).toFixed(4),
    late:      +(acc.late      + (day.late      || 0)).toFixed(4),
    undertime: +(acc.undertime + (day.undertime || 0)).toFixed(4),
    total:     +(acc.total     + (day.total     || 0)).toFixed(4),
  }), { regular: 0, overtime: 0, nd: 0, late: 0, undertime: 0, total: 0 })
}


/**
 * Convert "HH:MM" 24-hour string → "h:MM AM/PM"
 * e.g. "09:00" → "9:00 AM", "18:00" → "6:00 PM", "00:30" → "12:30 AM"
 */
export function to12Hour(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}