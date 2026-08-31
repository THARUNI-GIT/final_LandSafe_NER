import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, AlertTriangle, ShieldAlert, Siren, Users2, Route,
  Building2, BarChart3, Bot, Settings, LogOut, Mountain,
} from 'lucide-react'
import { useAuth } from '../components/AuthContext'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/map', icon: Map, label: 'GIS Risk Map' },
  { to: '/admin/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/admin/alerts', icon: ShieldAlert, label: 'Alerts' },
  { to: '/admin/sos', icon: Siren, label: 'SOS Requests' },
  { to: '/admin/taskforces', icon: Users2, label: 'Task Forces' },
  { to: '/admin/roads', icon: Route, label: 'Roads' },
  { to: '/admin/infrastructure', icon: Building2, label: 'Infrastructure' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-base-bg text-slate-100">
      <aside className="w-64 shrink-0 border-r border-base-border bg-base-panel flex flex-col">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-base-border">
          <Mountain className="w-6 h-6 text-blue-500" />
          <div>
            <p className="font-bold text-sm leading-tight">NE-SAHAYAK</p>
            <p className="text-[10px] text-slate-500 leading-tight">Command Center</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:bg-base-panel2 hover:text-slate-200 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-base-border">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'NA'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-500">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-risk-critical/10 hover:text-risk-critical transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
