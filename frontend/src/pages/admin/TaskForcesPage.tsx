import { useEffect, useState } from 'react'
import { Truck, Clock, MapPinned, Sparkles, Send, X } from 'lucide-react'
import { TaskForceService, IncidentService } from '../../api/service'
import { useAuth } from '../../components/AuthContext'
import type { TaskForce, Incident } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState, EmptyState } from '../../components/StatusBadges'

const availabilityStyles = {
  AVAILABLE: 'text-risk-low bg-risk-low/10 border-risk-low/20',
  DEPLOYED: 'text-risk-moderate bg-risk-moderate/10 border-risk-moderate/20',
  STANDBY: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
}

function DispatchModal({
  incidents,
  onClose,
  onDispatched,
}: {
  incidents: Incident[]
  onClose: () => void
  onDispatched: (tf: TaskForce) => void
}) {
  const { user } = useAuth()
  const [incidentId, setIncidentId] = useState(incidents[0]?.id || '')
  const [recommended, setRecommended] = useState<TaskForce[] | null>(null)
  const [dispatching, setDispatching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Authority scoping: district admin dispatches within district, state admin within state, central anywhere.
  const eligibleIncidents = incidents.filter((i) => {
    if (user?.role === 'DISTRICT_ADMIN') return i.district === user.district
    if (user?.role === 'STATE_ADMIN') return i.state === user.state
    return true
  })

  useEffect(() => {
    if (!incidentId) return
    setRecommended(null)
    TaskForceService.recommended(incidentId).then(setRecommended).catch(() => setRecommended([]))
  }, [incidentId])

  async function dispatch(taskForceId: string) {
    if (!incidentId) return
    setDispatching(true)
    setError(null)
    try {
      const tf = await TaskForceService.assign(taskForceId, incidentId)
      onDispatched(tf)
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to dispatch task force')
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 space-y-3" onClick={(e: any) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Send Task Force</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-[11px] text-slate-500">Incident / location</label>
          <select value={incidentId} onChange={(e) => setIncidentId(e.target.value)} className="w-full mt-1 bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200">
            {eligibleIncidents.length === 0 && <option value="">No eligible incidents in your authority</option>}
            {eligibleIncidents.map((i) => (
              <option key={i.id} value={i.id}>{i.locationName || i.locationId} — {i.description.slice(0, 40)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-slate-500">Available / recommended task forces</p>
          {recommended === null && <LoadingState label="Finding nearest units…" />}
          {recommended !== null && recommended.length === 0 && <EmptyState label="No available task forces" />}
          {recommended?.map((tf) => (
            <div key={tf.id} className="flex items-center justify-between bg-base-panel2 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-slate-100">{tf.name}</p>
                <p className="text-[10px] text-slate-500">{tf.capability} · {tf.distance}km · ETA {tf.eta}min</p>
              </div>
              <button
                onClick={() => dispatch(tf.id)}
                disabled={dispatching || !incidentId}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md"
              >
                <Send className="w-3 h-3" /> Dispatch
              </button>
            </div>
          ))}
        </div>

        {error && <p className="text-[11px] text-risk-critical">{error}</p>}
      </Card>
    </div>
  )
}

export default function TaskForcesPage() {
  const { user } = useAuth()
  const [taskForces, setTaskForces] = useState<TaskForce[] | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [recommended, setRecommended] = useState<TaskForce[]>([])
  const [noEligibleIncident, setNoEligibleIncident] = useState(false)
  const [showDispatch, setShowDispatch] = useState(false)

  const canDispatch = user?.role === 'DISTRICT_ADMIN' || user?.role === 'STATE_ADMIN' || user?.role === 'CENTRAL_ADMIN'

  function refresh() {
    TaskForceService.list().then(setTaskForces)
    IncidentService.list().then((incs) => {
      setIncidents(incs)
      const eligible = incs.find((i) => i.status === 'REPORTED' || i.status === 'VERIFIED')
      if (!eligible) {
        setNoEligibleIncident(true)
        return
      }
      setNoEligibleIncident(false)
      TaskForceService.recommended(eligible.id).then(setRecommended)
    })
  }

  useEffect(refresh, [])

  return (
    <div>
      <PageHeader
        title="Task Forces"
        subtitle="Emergency response units across the region"
        action={
          canDispatch ? (
            <button onClick={() => setShowDispatch(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg">
              <Send className="w-3.5 h-3.5" /> Send Task Force
            </button>
          ) : undefined
        }
      />
      <div className="p-6 space-y-6">
        {noEligibleIncident && (
          <EmptyState label="No active incidents available" sub="Task force recommendations need a pending or verified incident" />
        )}

        {recommended.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-300">AI-Recommended for Highest Risk Zone</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {recommended.map((tf) => (
                <Card key={tf.id} className="p-4 border-blue-600/30 bg-blue-600/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-100">{tf.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${availabilityStyles[tf.availability]}`}>{tf.availability}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">{tf.recommendationReason}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {tf.eta} min ETA</span>
                    <span className="flex items-center gap-1"><MapPinned className="w-3.5 h-3.5" /> {tf.distance} km</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">All Task Forces</h2>
          {taskForces === null ? (
            <LoadingState />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {taskForces.map((tf) => (
                <Card key={tf.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-base-panel2 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{tf.name}</p>
                        <p className="text-[11px] text-slate-500">{tf.location}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${availabilityStyles[tf.availability]}`}>{tf.availability}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{tf.capability}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tf.resources.map((r) => (
                      <span key={r} className="text-[10px] bg-base-panel2 text-slate-400 px-2 py-0.5 rounded">{r}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-base-border">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {tf.eta} min</span>
                    <span className="flex items-center gap-1"><MapPinned className="w-3.5 h-3.5" /> {tf.distance} km</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDispatch && (
        <DispatchModal
          incidents={incidents.filter((i) => i.status === 'REPORTED' || i.status === 'VERIFIED')}
          onClose={() => setShowDispatch(false)}
          onDispatched={() => { setShowDispatch(false); refresh() }}
        />
      )}
    </div>
  )
}
