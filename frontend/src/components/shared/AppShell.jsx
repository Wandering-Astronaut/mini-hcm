// src/components/shared/AppShell.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Clock, History, ShieldCheck,
  LogOut, UserCircle, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',   icon: History,         label: 'My History' },
]

export default function AppShell() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-white/[0.06] bg-slate-950/80 backdrop-blur">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Clock size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight">HCM</p>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase">Human Capital Management</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active')
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {profile?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx('sidebar-link', isActive && 'active')
              }
            >
              <ShieldCheck size={16} />
              Admin Panel
            </NavLink>
          )}
        </nav>

        {/* User card */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="glass-card px-3 py-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-600/30 border border-brand-500/30 flex items-center justify-center">
                <UserCircle size={16} className="text-brand-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.name || 'User'}</p>
                <p className="text-[10px] text-slate-500 capitalize">{profile?.role || 'employee'}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-secondary w-full text-xs py-2">
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  )
}
