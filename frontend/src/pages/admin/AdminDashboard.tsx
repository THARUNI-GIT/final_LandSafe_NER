import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert, Users2, Siren, Activity, MountainSnow } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DashboardService, AlertService, LocationService } from '../../api/service'
import type { Dashboard, Alert, Location } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState, SeverityBadge, AlertLevelBadge } from '../../components/StatusBadges'
import { useAuth } from '../../components/AuthContext'

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string | number; tint: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tint}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </Card>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    const call =
      user?.role === 'DISTRICT_ADMIN' && user.district
        ? DashboardService.district(user.district)
        : user?.role === 'STATE_ADMIN' && user.state
        ? DashboardService.state(user.state)
        : DashboardService.central()
    call.then(setDashboard)
    AlertService.active().then(setAlerts)
    LocationService.list().then((locs) => setLocations([...locs].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6)))
  }, [user])

  return (
    <div>
      <PageHeader
        title={`${user?.role === 'DISTRICT_ADMIN' ? user.district : user?.role === 'STATE_ADMIN' ? user.state : 'National'} Overview`}
        subtitle="Real-time landslide risk & response status"
      />
      <div className="p-6 space-y-6">
        {!dashboard ? (
          <LoadingState label="Loading dashboard…" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <StatCard icon={MountainSnow} label="Critical Locations" value={dashboard.criticalLocations} tint="bg-risk-critical/15 text-risk-critical" />
              <StatCard icon={Activity} label="High Risk Locations" value={dashboard.highRiskLocations} tint="bg-risk-high/15 text-risk-high" />
              <StatCard icon={ShieldAlert} label="Active Alerts" value={dashboard.activeAlerts} tint="bg-risk-moderate/15 text-risk-moderate" />
              <StatCard icon={Siren} label="Population At Risk" value={dashboard.populationAtRisk.toLocaleString()} tint="bg-blue-600/15 text-blue-400" />
              <StatCard icon={AlertTriangle} label="Active Incidents" value={dashboard.activeIncidents} tint="bg-orange-500/15 text-orange-400" />
              <StatCard icon={Users2} label="Available Task Forces" value={dashboard.availableTaskForces} tint="bg-risk-low/15 text-risk-low" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="p-5 lg:col-span-2">
                <h2 className="text-sm font-semibold text-slate-300 mb-4">Regional Risk Trend (24h)</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dashboard.riskTrend}>
                    <defs>
                      <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232d3a" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: '#121820', border: '1px solid #232d3a', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="riskScore" stroke="#3b82f6" strokeWidth={2} fill="url(#riskFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Active Alerts</h2>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {alerts.slice(0, 5).map((a) => (
                    <div key={a.id} className="border border-base-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <AlertLevelBadge level={a.level} />
                        <span className="text-[10px] text-slate-500">{new Date(a.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 line-clamp-2">{a.title}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Top Risk Locations</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-500 border-b border-base-border">
                      <th className="pb-2 font-medium">Location</th>
                      <th className="pb-2 font-medium">District</th>
                      <th className="pb-2 font-medium">Risk Score</th>
                      <th className="pb-2 font-medium">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-border">
                    {locations.map((l) => (
                      <tr key={l.id}>
                        <td className="py-2.5 font-medium text-slate-200">{l.name}</td>
                        <td className="py-2.5 text-slate-400">{l.district}, {l.state}</td>
                        <td className="py-2.5 text-slate-300">{l.riskScore}/100</td>
                        <td className="py-2.5"><SeverityBadge severity={l.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
