import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, MapPin, TrendingUp, ChevronRight } from 'lucide-react'
import { AlertService, LocationService } from '../../api/service'
import type { Alert, Location } from '../../types'
import { Card, LoadingState, SeverityBadge, AlertLevelBadge } from '../../components/StatusBadges'
import { useAuth } from '../../components/AuthContext'
import { useLanguage } from '../../i18n/LanguageContext'

export default function CitizenHome() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [nearby, setNearby] = useState<Location[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    AlertService.active().then(setAlerts)
    LocationService.list().then((locs) => setNearby(locs.filter((l) => l.district === user?.district).length ? locs.filter((l) => l.district === user?.district) : locs.slice(0, 4)))
  }, [user])

  const topAlert = alerts?.find((a) => a.severity === 'CRITICAL') ?? alerts?.[0]

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-100">{t('welcome')}, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">{t('stayInformed')}</p>
      </div>

      {alerts === null && <LoadingState label="Loading alerts…" />}

      {topAlert && (
        <Card className="p-4 border-risk-critical/40 bg-risk-critical/[0.06]">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="pulse-ring text-risk-critical absolute w-8 h-8" />
              <div className="relative w-8 h-8 rounded-full bg-risk-critical/20 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-risk-critical" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertLevelBadge level={topAlert.level} />
                <span className="text-[11px] text-slate-500">{new Date(topAlert.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-sm font-semibold text-slate-100">{topAlert.title}</p>
              <p className="text-xs text-slate-400 mt-1">{topAlert.message}</p>
            </div>
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-500" /> {t('riskNearYou')}
          </h2>
        </div>
        {nearby === null ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nearby.map((loc) => (
              <Card key={loc.id} className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-100 truncate pr-2">{loc.name}</p>
                  <SeverityBadge severity={loc.severity} />
                </div>
                <p className="text-xs text-slate-500 mb-2">{loc.district}, {loc.state}</p>
                <div className="w-full h-1.5 bg-base-panel2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-risk-critical"
                    style={{ width: `${loc.riskScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{t('riskScore')}: {loc.riskScore}/100</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-300">{t('quickActions')}</h2>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/citizen/map')}
            className="w-full flex items-center justify-between px-3.5 py-3 bg-base-panel2 hover:bg-base-panel2/70 rounded-lg text-sm font-medium text-slate-200 transition-colors"
          >
            {t('gisMap')} <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => navigate('/citizen/report')}
            className="w-full flex items-center justify-between px-3.5 py-3 bg-base-panel2 hover:bg-base-panel2/70 rounded-lg text-sm font-medium text-slate-200 transition-colors"
          >
            {t('reportIncident')} <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={() => navigate('/citizen/history')}
            className="w-full flex items-center justify-between px-3.5 py-3 bg-base-panel2 hover:bg-base-panel2/70 rounded-lg text-sm font-medium text-slate-200 transition-colors"
          >
            {t('viewHistory')} <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </Card>
    </div>
  )
}
