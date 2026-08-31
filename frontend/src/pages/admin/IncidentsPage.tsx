import { useEffect, useState } from 'react'
import { Clock, MapPin, Layers } from 'lucide-react'
import { IncidentService, LocationService } from '../../api/service'
import type { Incident, Location, IncidentStatus } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState, EmptyState, SeverityBadge } from '../../components/StatusBadges'
import { IncidentDetailModal } from '../../components/IncidentDetailModal'

const statusOptions: IncidentStatus[] = ['REPORTED', 'VERIFIED', 'RESPONDING', 'RESOLVED', 'REJECTED']

const statusStyles: Record<IncidentStatus, string> = {
  REPORTED: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  VERIFIED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  RESPONDING: 'text-risk-moderate bg-risk-moderate/10 border-risk-moderate/20',
  RESOLVED: 'text-risk-low bg-risk-low/10 border-risk-low/20',
  REJECTED: 'text-risk-critical bg-risk-critical/10 border-risk-critical/20',
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null)
  const [locations, setLocations] = useState<Record<string, Location>>({})
  const [filter, setFilter] = useState<IncidentStatus | 'ALL'>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    IncidentService.list().then(setIncidents)
    LocationService.list().then((locs) => setLocations(Object.fromEntries(locs.map((l) => [l.id, l]))))
  }, [])

  async function updateStatus(id: string, status: IncidentStatus) {
    const updated = await IncidentService.update(id, { status })
    if (updated) setIncidents((prev) => prev!.map((i) => (i.id === id ? updated : i)))
  }

  const filtered = incidents?.filter((i) => filter === 'ALL' || i.status === filter) ?? []
  const openIncident = filtered.find((i) => i.id === openId) || incidents?.find((i) => i.id === openId) || null

  return (
    <div>
      <PageHeader title="Incident Reports" subtitle="Citizen-reported incidents & AI verification status" />
      <div className="p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(['ALL', ...statusOptions] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                filter === s ? 'bg-blue-600/15 border-blue-600/40 text-blue-400' : 'bg-base-panel2 border-base-border text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {incidents === null && <LoadingState />}
        {incidents !== null && filtered.length === 0 && <EmptyState label="No incidents found" sub="Try a different filter" />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((inc) => (
            <Card
              key={inc.id}
              className="p-4 cursor-pointer hover:border-blue-600/40 transition-colors"
              onClick={() => setOpenId(inc.id)}
            >
              <div className="flex gap-3">
                <img src={inc.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyles[inc.status]}`}>{inc.status}</span>
                    <SeverityBadge severity={inc.verification.severity} />
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mb-1.5">{inc.description}</p>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                    <MapPin className="w-3 h-3" />
                    {inc.locationName || locations[inc.locationId]?.name || inc.locationId}
                    {inc.district ? ` · ${inc.district}, ${inc.state}` : ''}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                    <Clock className="w-3 h-3" /> {new Date(inc.timestamp).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Layers className="w-3 h-3" /> {inc.reporterName || 'Unknown reporter'} · GPS {inc.latitude?.toFixed(3)}, {inc.longitude?.toFixed(3)}
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-base-border flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  AI: <span className="text-slate-300">{inc.verification.classification}</span> ({inc.verification.confidence}%)
                </div>
                <select
                  value={inc.status}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateStatus(inc.id, e.target.value as IncidentStatus)}
                  className="bg-base-panel2 border border-base-border rounded-md text-[11px] px-2 py-1 text-slate-300 focus:outline-none"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {openIncident && (
        <IncidentDetailModal incident={openIncident} onClose={() => setOpenId(null)} onUpdateStatus={updateStatus} />
      )}
    </div>
  )
}
