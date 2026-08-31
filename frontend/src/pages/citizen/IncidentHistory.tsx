import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { IncidentService } from '../../api/service'
import type { Incident, IncidentStatus } from '../../types'
import { Card, LoadingState, EmptyState, SeverityBadge } from '../../components/StatusBadges'

const statusStyles: Record<IncidentStatus, string> = {
  REPORTED: 'text-slate-400 bg-slate-500/10',
  VERIFIED: 'text-blue-400 bg-blue-500/10',
  RESPONDING: 'text-risk-moderate bg-risk-moderate/10',
  RESOLVED: 'text-risk-low bg-risk-low/10',
  REJECTED: 'text-risk-critical bg-risk-critical/10',
}

export default function IncidentHistory() {
  const [incidents, setIncidents] = useState<Incident[] | null>(null)

  useEffect(() => {
    IncidentService.list().then(setIncidents)
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-100">My Reports</h1>
        <p className="text-sm text-slate-500">Track verification status of your submissions</p>
      </div>

      {incidents === null && <LoadingState />}
      {incidents?.length === 0 && <EmptyState label="No reports yet" sub="Reports you submit will appear here" />}

      <div className="space-y-3">
        {incidents?.map((inc) => (
          <Card key={inc.id} className="p-3.5">
            <div className="flex gap-3">
              <img src={inc.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusStyles[inc.status]}`}>
                    {inc.status}
                  </span>
                  <SeverityBadge severity={inc.verification.severity} />
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{inc.description}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1.5">
                  <Clock className="w-3 h-3" />
                  {new Date(inc.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
