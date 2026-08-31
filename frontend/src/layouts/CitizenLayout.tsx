import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, AlertTriangle, History, User, Mountain, LogOut, Siren, Map } from 'lucide-react'
import { useAuth } from '../components/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import OnboardingModal from '../components/OnboardingModal'

export default function CitizenLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const navItems = [
    { to: '/citizen', icon: Home, label: t('home'), end: true },
    { to: '/citizen/map', icon: Map, label: t('map') },
    { to: '/citizen/report', icon: AlertTriangle, label: t('report') },
    { to: '/citizen/history', icon: History, label: t('history') },
    { to: '/citizen/profile', icon: User, label: t('profile') },
  ]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-base-bg text-slate-100 flex flex-col">
      <OnboardingModal />
      <header className="h-16 border-b border-base-border bg-base-panel flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Mountain className="w-6 h-6 text-blue-500" />
          <div>
            <p className="font-bold text-sm leading-tight">{t('appName')}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{user?.district}, {user?.state}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          <button
            onClick={() => navigate('/citizen/sos')}
            className="relative flex items-center gap-1.5 bg-risk-critical/15 text-risk-critical border border-risk-critical/40 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-risk-critical/25 transition-colors"
          >
            <Siren className="w-3.5 h-3.5" /> {t('sos')}
          </button>
          <button onClick={handleLogout} className="text-slate-400 hover:text-risk-critical transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-20 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-base-panel border-t border-base-border flex justify-around py-2 z-20">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-500'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
