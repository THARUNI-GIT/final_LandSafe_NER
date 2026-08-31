import { useEffect, useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { LocationService, IncidentService, DashboardService } from '../../api/service'
import type { Location, Incident, Dashboard } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState } from '../../components/StatusBadges'
import { useAuth } from '../../components/AuthContext'

const SEVERITY_COLORS: Record<string, string> = { LOW: '#22c55e', MODERATE: '#eab308', HIGH: '#f97316', CRITICAL: '#dc2626' }

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [locations, setLocations] = useState<Location[] | null>(null)
  const [incidents, setIncidents] = useState<Incident[] | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)

  useEffect(() => {
    LocationService.list().then(setLocations)
    IncidentService.list().then(setIncidents)
    const call =
      user?.role === 'DISTRICT_ADMIN' && user.district
        ? DashboardService.district(user.district)
        : user?.role === 'STATE_ADMIN' && user.state
        ? DashboardService.state(user.state)
        : DashboardService.central()
    call.then(setDashboard)
  }, [user])

  if (!locations || !incidents || !dashboard) {
    return (
      <div>
        <PageHeader title="Analytics" subtitle="Regional risk and response analytics" />
        <div className="p-6"><LoadingState /></div>
      </div>
    )
  }

  const bySeverity = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((sev) => ({
    name: sev,
    value: locations.filter((l) => l.severity === sev).length,
  }))

  const byState = Object.values(
    locations.reduce((acc, l) => {
      acc[l.state] = acc[l.state] || { state: l.state, avgRisk: 0, count: 0 }
      acc[l.state].avgRisk += l.riskScore
      acc[l.state].count += 1
      return acc
    }, {} as Record<string, { state: string; avgRisk: number; count: number }>)
  ).map((s) => ({ state: s.state, avgRisk: Math.round(s.avgRisk / s.count) }))

  const incidentsByStatus = ['REPORTED', 'VERIFIED', 'RESPONDING', 'RESOLVED', 'REJECTED'].map((status) => ({
    status,
    count: incidents.filter((i) => i.status === status).length,
  }))

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Regional risk and response analytics" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Locations by Severity</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {bySeverity.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#121820', border: '1px solid #232d3a', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Average Risk Score by State</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byState}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232d3a" vertical={false} />
                <XAxis dataKey="state" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#121820', border: '1px solid #232d3a', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="avgRisk" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Incident Pipeline</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={incidentsByStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#232d3a" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="status" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={{ background: '#121820', border: '1px solid #232d3a', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}