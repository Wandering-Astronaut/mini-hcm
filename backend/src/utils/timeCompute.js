// src/utils/timeCompute.js
export function computeAttendanceMetrics(punchIn, punchOut, shiftStart, shiftEnd) {
  const [ssH, ssM] = shiftStart.split(':').map(Number)
  const [seH, seM] = shiftEnd.split(':').map(Number)

  const schedStart = new Date(punchIn)
  schedStart.setHours(ssH, ssM, 0, 0)

  const schedEnd = new Date(punchIn)
  schedEnd.setHours(seH, seM, 0, 0)
  if (schedEnd <= schedStart) schedEnd.setDate(schedEnd.getDate() + 1)

  const lateMinutes      = Math.max(0, (punchIn - schedStart)  / 60000)
  const undertimeMinutes = punchOut < schedEnd ? Math.max(0, (schedEnd - punchOut) / 60000) : 0
  const workedMinutes    = Math.max(0, (punchOut - punchIn) / 60000)

  const effectiveStart = punchIn  > schedStart ? punchIn  : schedStart
  const effectiveEnd   = punchOut < schedEnd   ? punchOut : schedEnd
  const regularMinutes = Math.max(0, (effectiveEnd - effectiveStart) / 60000)

  const otMinutes = punchOut > schedEnd ? Math.max(0, (punchOut - schedEnd) / 60000) : 0

  // ND: count minutes in 22:00–06:00 window
  let ndMinutes = 0
  let cursor = new Date(punchIn)
  while (cursor < punchOut) {
    const h = cursor.getHours()
    if (h >= 22 || h < 6) ndMinutes++
    cursor = new Date(cursor.getTime() + 60000)
  }

  return {
    regular:   +(regularMinutes  / 60).toFixed(4),
    overtime:  +(otMinutes       / 60).toFixed(4),
    nd:        +(ndMinutes       / 60).toFixed(4),
    late:      +(lateMinutes     / 60).toFixed(4),
    undertime: +(undertimeMinutes/ 60).toFixed(4),
    total:     +(workedMinutes   / 60).toFixed(4),
  }
}
