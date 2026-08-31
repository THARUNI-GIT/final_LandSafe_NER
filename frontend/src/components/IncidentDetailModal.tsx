import { useEffect, useState } from 'react'
import { X, MapPin, Clock, User, Layers, ShieldCheck, Truck } from 'lucide-react'
import { TaskForceService } from '../api/service'
import type { Incident, IncidentStatus, TaskForce } from '../types'
import { Card, SeverityBadge } from './StatusBadges'

const statusOptions: IncidentStatus[] = ['REPORTED', 'VERIFIED', 'RESPONDING', 'RESOLVED', 'REJECTED']

export function IncidentDetailModal({
  incident,
  onClose,
  onUpdateStatus,
}: {
  incident: Incident
  onClose: () => void
  onUpdateStatus: (id: string, status: IncidentStatus) => void
}) {
  const [recommended, setRecommended] = useState<TaskForce[] | null>(null)

  useEffect(() => {
    setRecommended(null)
    TaskForceService.recommended(incident.id).then(setRecommended).catch(() => setRecommended([]))
  }, [incident.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card className="p-0 overflow-hidden">
          <div className="relative">
            <img src={incident.imageUrl} alt="" className="w-full h-48 object-cover" />
            <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-slate-200">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-3 flex gap-2">
              <SeverityBadge severity={incident.verification.severity} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-black/50 text-slate-200 border-white/20">{incident.status}</span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-200">{incident.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{incident.locationName || incident.locationId}{incident.district ? ` — ${incident.district}, ${incident.state}` : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {new Date(incident.timestamp).toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <User className="w-3.5 h-3.5 shrink-0" />
                {incident.reporterName || 'Unknown reporter'}{incident.reporterEmail ? ` (${incident.reporterEmail})` : ''}
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                Cluster: {incident.clusterId || 'None'}
              </div>
            </div>

            <Card className="p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">GPS Location</p>
              <p className="text-xs text-slate-300">Lat {incident.latitude?.toFixed(5)}, Lng {incident.longitude?.toFixed(5)}</p>
            </Card>

            <Card className="p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Image Verification
              </p>
              <p className="text-xs text-slate-300">
                {incident.verification.classification} — {incident.verification.confidence}% confidence
              </p>
            </Card>

            <Card className="p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Recommended Task Force
              </p>
              {recommended === null && <p className="text-xs text-slate-500">Loading…</p>}
              {recommended !== null && recommended.length === 0 && <p className="text-xs text-slate-500">No task force recommendation available.</p>}
              {recommended && recommended[0] && (
                <p className="text-xs text-slate-300">
                  {recommended[0].name} ({recommended[0].capability}) — {recommended[0].distance.toFixed(1)}km away, ETA {recommended[0].eta}min
                </p>
              )}
            </Card>

            <div className="flex items-center justify-between pt-2 border-t border-base-border">
              <span className="text-[11px] text-slate-500">Update status</span>
              <select
                value={incident.status}
                onChange={(e) => onUpdateStatus(incident.id, e.target.value as IncidentStatus)}
                className="bg-base-panel2 border border-base-border rounded-md text-[11px] px-2 py-1 text-slate-300 focus:outline-none"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
