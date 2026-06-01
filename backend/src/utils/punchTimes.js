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

function isPlausibleOvernightShift(punchInHhmm, punchOutHhmm) {
  const inMin = minutesFromHhmm(punchInHhmm)
  const outMin = minutesFromHhmm(punchOutHhmm)
  if (outMin > inMin) return false
  return inMin >= 17 * 60 && outMin <= 12 * 60
}

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

  if (pout - pin > 24 * 60 * 60 * 1000) {
    return { error: 'Shift cannot exceed 24 hours.' }
  }

  return { pin, pout }
}
