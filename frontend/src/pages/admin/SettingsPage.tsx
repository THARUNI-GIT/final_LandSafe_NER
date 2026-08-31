import { useState } from 'react'
import { Bell, Moon, Globe, Shield } from 'lucide-react'
import { useAuth } from '../../components/AuthContext'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/StatusBadges'

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-10 h-5.5 rounded-full transition-colors relative ${checked ? 'bg-blue-600' : 'bg-base-panel2'}`}
    >
      <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [alertsOn, setAlertsOn] = useState(true)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account preferences and notification settings" />
      <div className="p-6 max-w-2xl space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/15 text-blue-400 flex items-center justify-center text-sm font-bold">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email} · {user?.role.replace('_', ' ')}</p>
            </div>
          </div>
        </Card>

        <Card className="divide-y divide-base-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-200">Push Notifications</p>
                <p className="text-[11px] text-slate-500">Receive alerts for new incidents & warnings</p>
              </div>
            </div>
            <Toggle checked={alertsOn} onChange={() => setAlertsOn((v) => !v)} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-200">Critical Alerts Only</p>
                <p className="text-[11px] text-slate-500">Mute WATCH and PREPARE level alerts</p>
              </div>
            </div>
            <Toggle checked={criticalOnly} onChange={() => setCriticalOnly((v) => !v)} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-200">Dark Interface</p>
                <p className="text-[11px] text-slate-500">Command center dark theme</p>
              </div>
            </div>
            <Toggle checked={darkMode} onChange={() => setDarkMode((v) => !v)} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-sm text-slate-200">Jurisdiction</p>
                <p className="text-[11px] text-slate-500">{user?.district ?? user?.state ?? 'National'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
