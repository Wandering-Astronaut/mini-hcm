// src/pages/RegisterPage.jsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Clock, Mail, Lock, User, AlertCircle, ArrowRight, Globe } from 'lucide-react'
import ScheduleTimePicker from '../components/shared/ScheduleTimePicker'
const TIMEZONES = Intl.supportedValuesOf('timeZone')

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm]   = useState({
    name: '', email: '', password: '', confirmPassword: '',
    timezone: '',
    scheduleStart: '', scheduleEnd: '',
  })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const [tzSearch, setTzSearch] = useState('')
  const [tzOpen, setTzOpen] = useState(false)
 
  const wrapperRef = useRef(null)

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  
  const name = form.name.trim()

  const fullNameRegex = /^[A-Za-zÀ-ÿ' -]+$/

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullNameRegex.test(name)) {
      return setError(
        'Name can only contain letters, spaces, hyphens, and apostrophes.'
      )
    }
    if (name.split(/\s+/).length < 2) {
      return setError('Please enter your first and last name.')
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.')
    }
    if (!strongPassword.test(form.password)) {
      return setError(
        'Password must be at least 8 characters and include an uppercase letter, lowercase letter, and number.'
      )
    }
  
    if (!form.timezone) {
      return setError('Please select a timezone.')
    }
  
    if (!form.scheduleStart || !form.scheduleEnd) {
      return setError('Please set both shift start and end time.')
    }
  
    if (form.scheduleStart >= form.scheduleEnd) {
      return setError('Shift start must be earlier than shift end.')
    }
    setLoading(true)
    setError('')
    try {
      await register({
        email:    form.email.toLowerCase().trim(),
        password: form.password,
        name:     form.name.trim().replace(/\s+/g, ' '),
        timezone: form.timezone,
        role:     'employee',
        schedule: { start: form.scheduleStart, end: form.scheduleEnd },
      })
      navigate('/dashboard')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }


  const filteredTimezones = TIMEZONES
  .map(tz => ({
    tz,
    score: scoreTimezone(tz, tzSearch)
  }))
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(item => item.tz)

  
  function scoreTimezone(tz, input) {
    const t = tz.toLowerCase()
    const i = input.toLowerCase()
  
    const city = t.split('/')[1] || ''
    const region = t.split('/')[0] || ''
  
    if (!i) return 1
  
    if (t.startsWith(i)) return 4          
    if (city.startsWith(i)) return 3
    if (t.includes(i)) return 2
    if (region.includes(i)) return 1
  
    return 0
  }


  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setTzOpen(false)
      }
    }
  
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])
  

  const password = form.password

  function getPasswordStrength(pw) {
    let score = 0
  
    if (pw.length >= 8) score++
    if (/[a-z]/.test(pw)) score++
    if (/[A-Z]/.test(pw)) score++
    if (/\d/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
  
    return score // 0–5
  }
  
  const strength = getPasswordStrength(password)
  
  function strengthColor() {
    if (strength <= 1) return 'bg-red-500'
    if (strength === 2) return 'bg-orange-500'
    if (strength === 3) return 'bg-yellow-400'
    return 'bg-green-500'
  }
  
  function strengthLabel() {
    if (strength <= 1) return 'Weak'
    if (strength === 2) return 'Fair'
    if (strength === 3) return 'Good'
    return 'Strong'
  }


  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">HCM</h1>
            <p className="text-xs text-slate-500">Human Capital Management</p>
          </div>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-3xl font-bold text-white mb-1 text-center">Create account</h2>
          <p className="text-sm text-slate-400 mb-8 text-center">Set up your employee profile</p>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 mb-6 text-sm text-rose-400">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="name" type="text" required
                  placeholder="Full Name"
                  value={form.name} 
                  onChange={(e) => {
                    let value = e.target.value
                  
                    if (value.startsWith('-')) return
                  
                    value = value.replace(/[^A-Za-zÀ-ÿ' -]/g, '')
                  
                    value = value
                      .toLowerCase()
                      .split(' ')
                      .map(word =>
                        word
                          .split('-')
                          .map(part =>
                            part.charAt(0).toUpperCase() + part.slice(1)
                          )
                          .join('-')
                      )
                      .join(' ')
                  
                    setForm(f => ({ ...f, name: value }))
                    setError('')
                  }}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  name="email" type="email" required
                  placeholder="name@gmail.com"
                  value={form.email} 
                  onChange={(e) => {
                    setForm(f => ({
                      ...f,
                      email: e.target.value.toLowerCase()
                    }))
                    setError('')
                  }}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    name="password" type="password" required
                    placeholder="••••••••"
                    value={form.password} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '') // remove all spaces
                    
                      setForm(f => ({ ...f, password: value }))
                      setError('')
                    }}
                    className="input-field pl-10"
                  />
                </div>
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor()}`}
                      style={{ width: `${(strength / 5) * 100}%` }}
                    />
                  </div>

                  <p className="text-xs mt-1 text-slate-400">
                    Strength: {strengthLabel()}
                  </p>

              </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    name="confirmPassword" type="password" required
                    placeholder="••••••••"
                    value={form.confirmPassword} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s/g, '') // remove all spaces
                    
                      setForm(f => ({ ...f, confirmPassword: value }))
                      setError('')
                    }}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Timezone</label>
              <div ref={wrapperRef} className="relative">
                <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <div className="relative">
                  <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />

                  <input
                    type="text"
                    placeholder="Search timezone..."
                    value={tzSearch}
                    onChange={(e) => {
                      const val = e.target.value
                      setTzSearch(val)
                      setTzOpen(true)
                    }}
                    className="input-field pl-10"
                  />

                  {tzOpen && tzSearch &&(
                    <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-xl scrollbar-thin">
                      {filteredTimezones.length === 0 && (
                        <div className="px-3 py-2 text-sm text-slate-500">
                          No results found
                        </div>
                      )}

                      {filteredTimezones.map((tz) => (
                        <div
                          key={tz}
                          onClick={() => {
                            setForm(f => ({ ...f, timezone: tz }))
                            setTzSearch(tz)
                            setTzOpen(false)   
                          }}
                          className="px-3 py-2 text-sm text-white hover:bg-white/10 cursor-pointer"
                        >
                          {tz}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="overflow-visible rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Work Schedule
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Shift start</label>
                  <ScheduleTimePicker
                    name="scheduleStart"
                    value={form.scheduleStart}
                    onChange={v => setForm(f => ({ ...f, scheduleStart: v }))}
                  />
                </div>
                <div>
                  <label className="label">Shift end</label>
                  <ScheduleTimePicker
                    name="scheduleEnd"
                    value={form.scheduleEnd}
                    onChange={v => setForm(f => ({ ...f, scheduleEnd: v }))}
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )


  
}

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    default:
      return 'Registration failed. Please try again.'
  }
}

