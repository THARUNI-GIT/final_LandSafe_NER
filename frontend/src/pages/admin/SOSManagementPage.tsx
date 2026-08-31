import { useEffect, useState } from 'react'
import { Clock, MapPin, Phone, Siren, Truck, CheckCircle2, XCircle } from 'lucide-react'
import { SOSService, TaskForceService } from '../../api/service'
import type { SOSRequest, TaskForce } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState, EmptyState, SOSStatusBadge } from '../../components/StatusBadges'

const TABS = ['PENDING', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED', 'CANCELLED', 'ALL'] as const
type Tab = (typeof TABS)[number]

function AssignRow({ sos, taskForces, onUpdated }: { sos: SOSRequest; taskForces: TaskForce[]; onUpdated: (s: SOSRequest) => void }) {
  const [taskForceId, setTaskForceId] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const available = taskForces.filter((t) => t.availability === 'AVAILABLE')

  async function act(status: 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED') {
    if (status === 'DISPATCHED' && !taskForceId) {
      setError('Select a task force to dispatch')
      return
    }
    setBusy(status)
    setError(null)
    try {
      const updated = await SOSService.update(sos.id, {
        status,
        ...(status === 'DISPATCHED' ? { assignedTaskForceId: taskForceId } : {}),
      })
      onUpdated(updated)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update SOS request')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className={`p-4 ${sos.status === 'PENDING' ? 'border-risk-critical/40' : ''}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 mb-1.5">
            <SOSStatusBadge status={sos.status} />
            {sos.district && (
              <span className="text-[10px] text-slate-500">{sos.district}{sos.state ? `, ${sos.state}` : ''}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-100">{sos.reporterName || 'Citizen'}</p>
          {sos.message && <p className="text-xs text-slate-400 mt-1">{sos.message}</p>}
          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 flex-wrap">
            {sos.reporterPhone && (
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {sos.reporterPhone}</span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {sos.latitude?.toFixed(4)}, {sos.longitude?.toFixed(4)}
            </span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(sos.timestamp).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sos.status === 'PENDING' && (
            <button
              onClick={() => act('ACKNOWLEDGED')}
              disabled={busy !== null}
              className="flex items-center gap-1.5 bg-risk-moderate/15 hover:bg-risk-moderate/25 text-risk-moderate text-xs font-semibold px-3 py-1.5 rounded-lg border border-risk-moderate/30 disabled:opacity-60"
            >
              {busy === 'ACKNOWLEDGED' ? 'Acknowledging…' : 'Acknowledge'}
            </button>
          )}

          {(sos.status === 'PENDING' || sos.status === 'ACKNOWLEDGED') && (
            <>
              <select
                value={taskForceId}
                onChange={(e) => setTaskForceId(e.target.value)}
                className="bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-1.5 text-slate-200"
              >
                <option value="">Assign task force…</option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.capability}</option>
                ))}
              </select>
              <button
                onClick={() => act('DISPATCHED')}
                disabled={busy !== null}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
              >
                <Truck className="w-3.5 h-3.5" /> {busy === 'DISPATCHED' ? 'Dispatching…' : 'Dispatch'}
              </button>
            </>
          )}

          {(sos.status === 'PENDING' || sos.status === 'ACKNOWLEDGED' || sos.status === 'DISPATCHED') && (
            <button
              onClick={() => act('RESOLVED')}
              disabled={busy !== null}
              className="flex items-center gap-1.5 bg-risk-low/15 hover:bg-risk-low/25 text-risk-low text-xs font-semibold px-3 py-1.5 rounded-lg border border-risk-low/30 disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
            </button>
          )}

          {sos.status !== 'RESOLVED' && sos.status !== 'CANCELLED' && (
            <button
              onClick={() => act('CANCELLED')}
              disabled={busy !== null}
              className="flex items-center gap-1.5 text-slate-500 hover:text-risk-critical text-xs font-semibold px-3 py-1.5 rounded-lg border border-transparent hover:border-risk-critical/30 disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-[11px] text-risk-critical mt-2">{error}</p>}
    </Card>
  )
}

export default function SOSManagementPage() {
  const [requests, setRequests] = useState<SOSRequest[] | null>(null)
  const [taskForces, setTaskForces] = useState<TaskForce[]>([])
  const [tab, setTab] = useState<Tab>('PENDING')

  useEffect(() => {
    SOSService.list().then(setRequests)
    TaskForceService.list().then(setTaskForces)
  }, [])

  function replace(updated: SOSRequest) {
    setRequests((prev) => (prev ?? []).map((r) => (r.id === updated.id ? updated : r)))
  }

  const filtered = (requests ?? [])
    .filter((r) => tab === 'ALL' || r.status === tab)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const pendingCount = (requests ?? []).filter((r) => r.status === 'PENDING').length

  return (
    <div>
      <PageHeader
        title="SOS Requests"
        subtitle="Citizen distress calls — acknowledge, dispatch, resolve"
        action={
          pendingCount > 0 ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-risk-critical">
              <Siren className="w-3.5 h-3.5 animate-pulse" /> {pendingCount} pending
            </span>
          ) : undefined
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                tab === t ? 'bg-blue-600/15 border-blue-600/40 text-blue-400' : 'bg-base-panel2 border-base-border text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {requests === null && <LoadingState />}
        {requests !== null && filtered.length === 0 && <EmptyState label="No SOS requests" sub={tab !== 'ALL' ? `None with status ${tab}` : undefined} />}

        <div className="space-y-3">
          {filtered.map((sos) => (
            <AssignRow key={sos.id} sos={sos} taskForces={taskForces} onUpdated={replace} />
          ))}
        </div>
      </div>
    </div>
  )
}
