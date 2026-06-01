// src/utils/timeCompute.js
// Core HCM computation logic — OT, ND, Late, Undertime, Regular hours

export function parseTime(str) {
  const [h, m] = str.split(':').map(Number)
  return { hours: h, minutes: m }
}

export function toMinutes(str) {
  const { hours, minutes } = parseTime(str)
  return hours * 60 + minutes
}

export function formatHours(decimalHours) {
  const n = Number(decimalHours)
  if (!n || n <= 0) return '0h 0m'
  const h = Math.floor(n)
  const m = Math.round((n - h) * 60)
  return `${h}h ${m}m`
}

export function computeNDMinutes(punchIn, punchOut) {
  let nd = 0
  let cursor = new Date(punchIn)

  while (cursor < punchOut) {
    const hour = cursor.getHours()
    if (hour >= 22 || hour < 6) nd++
    cursor = new Date(cursor.getTime() + 60 * 1000)
  }
  return nd
}

/**
 * @param {Date} punchIn
 * @param {Date} punchOut
 * @param {string} shiftStart "HH:MM"
 * @param {string} shiftEnd "HH:MM"
 */
export function computeAttendanceMetrics(punchIn, punchOut, shiftStart, shiftEnd) {
  const dateRef = new Date(punchIn)
  dateRef.setSeconds(0, 0)

  const [ssH, ssM] = shiftStart.split(':').map(Number)
  const [seH, seM] = shiftEnd.split(':').map(Number)

  const schedStart = new Date(dateRef)
  schedStart.setHours(ssH, ssM, 0, 0)

  const schedEnd = new Date(dateRef)
  schedEnd.setHours(seH, seM, 0, 0)
  if (schedEnd <= schedStart) schedEnd.setDate(schedEnd.getDate() + 1)

  const scheduledMinutes = (schedEnd - schedStart) / 60000

  const overlapStart = Math.max(punchIn.getTime(), schedStart.getTime())
  const overlapEnd = Math.min(punchOut.getTime(), schedEnd.getTime())
  const workedDuringShift = overlapEnd > overlapStart

  // Late: only if arrival is after scheduled start
  const lateMinutes = punchIn > schedStart
    ? Math.max(0, (punchIn - schedStart) / 60000)
    : 0

  // Undertime: left before scheduled end, but only if they actually worked during the shift window
  const undertimeMinutes =
    workedDuringShift && punchOut < schedEnd
      ? Math.max(0, (schedEnd - punchOut) / 60000)
      : 0

  const workedMinutes = Math.max(0, (punchOut - punchIn) / 60000)

  const effectiveStart = punchIn > schedStart ? punchIn : schedStart
  const effectiveEnd = punchOut < schedEnd ? punchOut : schedEnd
  const regularMinutes = Math.max(0, (effectiveEnd - effectiveStart) / 60000)

  const otMinutes =
    punchOut > schedEnd ? Math.max(0, (punchOut - schedEnd) / 60000) : 0

  const ndMinutes = Math.min(computeNDMinutes(punchIn, punchOut), workedMinutes)

  return {
    regular: +(regularMinutes / 60).toFixed(4),
    overtime: +(otMinutes / 60).toFixed(4),
    nd: +(ndMinutes / 60).toFixed(4),
    late: +(lateMinutes / 60).toFixed(4),
    undertime: +(undertimeMinutes / 60).toFixed(4),
    total: +(workedMinutes / 60).toFixed(4),
    scheduled: +(scheduledMinutes / 60).toFixed(4),
  }
}

export function aggregateWeekly(dailyMetrics) {
  return dailyMetrics.reduce(
    (acc, day) => ({
      regular: +(acc.regular + (day.regular || 0)).toFixed(4),
      overtime: +(acc.overtime + (day.overtime || 0)).toFixed(4),
      nd: +(acc.nd + (day.nd || 0)).toFixed(4),
      late: +(acc.late + (day.late || 0)).toFixed(4),
      undertime: +(acc.undertime + (day.undertime || 0)).toFixed(4),
      total: +(acc.total + (day.total || 0)).toFixed(4),
    }),
    { regular: 0, overtime: 0, nd: 0, late: 0, undertime: 0, total: 0 }
  )
}

export function to12Hour(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
