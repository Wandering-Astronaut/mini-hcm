// Mirrors frontend/src/utils/timeCompute.js — keep in sync

function computeNDMinutes(punchIn, punchOut) {
  let nd = 0
  let cursor = new Date(punchIn)
  while (cursor < punchOut) {
    const hour = cursor.getHours()
    if (hour >= 22 || hour < 6) nd++
    cursor = new Date(cursor.getTime() + 60000)
  }
  return nd
}

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

  const overlapStart = Math.max(punchIn.getTime(), schedStart.getTime())
  const overlapEnd = Math.min(punchOut.getTime(), schedEnd.getTime())
  const workedDuringShift = overlapEnd > overlapStart

  const lateMinutes = punchIn > schedStart
    ? Math.max(0, (punchIn - schedStart) / 60000)
    : 0

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
  }
}
