import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES = [0, 15, 30, 45]
const PERIODS = ['AM', 'PM']

/** Same panel as timezone dropdown in RegisterPage */
const DROPDOWN_PANEL =
  'absolute z-50 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-xl'

const DROPDOWN_ITEM =
  'cursor-pointer px-3 py-2 text-center text-sm text-white hover:bg-white/10'

const DROPDOWN_ITEM_SELECTED = 'bg-white/10 text-brand-300'

function parseHhmm(hhmm) {
  if (!hhmm) {
    return {
      hour12: 12,
      minute: 0,
      ampm: 'AM',
    }
  }

  const [hStr, mStr] = hhmm.split(':')
  const h24 = parseInt(hStr, 10)
  const minute = parseInt(mStr, 10)

  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const hour12 = h24 % 12 || 12

  return { hour12, minute, ampm }
}

function toHhmm(hour12, minute, ampm) {
  let h24 = hour12
  if (ampm === 'AM') h24 = hour12 === 12 ? 0 : hour12
  else h24 = hour12 === 12 ? 12 : hour12 + 12
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function formatDisplay(hhmm) {
  const { hour12, minute, ampm } = parseHhmm(hhmm)
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`
}

function Column({ label, children }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="border-b border-white/10 py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <div className="max-h-48 overflow-y-auto scrollbar-thin">{children}</div>
    </div>
  )
}

export default function ScheduleTimePicker({ name, value, onChange }) {
  const [open, setOpen] = useState(false)
  const parsed = parseHhmm(value)
  const [hour12, setHour12] = useState(parsed.hour12)
  const [minute, setMinute] = useState(parsed.minute)
  const [ampm, setAmpm] = useState(parsed.ampm)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) {
      const p = parseHhmm(value)
      setHour12(p.hour12)
      setMinute(p.minute)
      setAmpm(p.ampm)
    }
  }, [value, open])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function apply(h, m, p) {
    setHour12(h)
    setMinute(m)
    setAmpm(p)
    onChange(toHhmm(h, m, p))
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`input-field w-full cursor-pointer pr-10 text-left ${
          open ? 'border-brand-500/50 ring-2 focus:ring-brand-500/20' : ''
        }`}
      >
        {value ? formatDisplay(value) : 'Select time'}
      </button>
      <Clock
        size={15}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
      />

      {open && (
        <div className={`${DROPDOWN_PANEL} bottom-full left-0 right-0 mb-2`}>
          <div className="flex divide-x divide-white/10">
            <Column label="Hour">
              {HOURS.map(h => (
                <div
                  key={h}
                  role="option"
                  aria-selected={h === hour12}
                  onClick={() => apply(h, minute, ampm)}
                  className={`${DROPDOWN_ITEM} ${h === hour12 ? DROPDOWN_ITEM_SELECTED : ''}`}
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </Column>
            <Column label="Min">
              {MINUTES.map(m => (
                <div
                  key={m}
                  role="option"
                  aria-selected={m === minute}
                  onClick={() => apply(hour12, m, ampm)}
                  className={`${DROPDOWN_ITEM} ${m === minute ? DROPDOWN_ITEM_SELECTED : ''}`}
                >
                  {String(m).padStart(2, '0')}
                </div>
              ))}
            </Column>
            <Column label="Period">
              {PERIODS.map(p => (
                <div
                  key={p}
                  role="option"
                  aria-selected={p === ampm}
                  onClick={() => apply(hour12, minute, p)}
                  className={`${DROPDOWN_ITEM} ${p === ampm ? DROPDOWN_ITEM_SELECTED : ''}`}
                >
                  {p}
                </div>
              ))}
            </Column>
          </div>
        </div>
      )}
    </div>
  )
}
