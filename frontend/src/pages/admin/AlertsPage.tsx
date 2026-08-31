import { useEffect, useState } from 'react'
import { Clock, MapPin, Send, X } from 'lucide-react'
import { AlertService, LocationService } from '../../api/service'
import { useAuth } from '../../components/AuthContext'
import type { Alert, Location, Severity } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState, EmptyState, AlertLevelBadge, SeverityBadge } from '../../components/StatusBadges'

const severities: Severity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']

function SendAlertModal({ locations, onClose, onSent }: { locations: Location[]; onClose: () => void; onSent: (a: Alert) => void }) {
  const { user } = useAuth()
  const [locationId, setLocationId] = useState(locations[0]?.id || '')
  const [severity, setSeverity] = useState<Severity>('MODERATE')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Authority scoping: DISTRICT_ADMIN -> their district, STATE_ADMIN -> their state, CENTRAL_ADMIN -> any.
  const scoped = locations.filter((l) => {
    if (user?.role === 'DISTRICT_ADMIN') return l.district === user.district
    if (user?.role === 'STATE_ADMIN') return l.state === user.state
    return true
  })

  async function submit() {
    if (!title || !message || !locationId) {
      setError('Location, title and message are required')
      return
    }
    setSending(true)
    setError(null)
    try {
      const loc = scoped.find((l) => l.id === locationId)
      const alert = await AlertService.create({
        title,
        message,
        severity,
        locationIds: [locationId],
        district: loc?.district,
        state: loc?.state,
      })
      onSent(alert)
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send alert')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-5 space-y-3" onClick={(e: any) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Send Alert</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-[11px] text-slate-500">Affected location</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full mt-1 bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200">
            {scoped.map((l) => (
              <option key={l.id} value={l.id}>{l.name} — {l.district}, {l.state}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-500">Severity / type</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className="w-full mt-1 bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200">
            {severities.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-500">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200" placeholder="e.g. Landslide risk — evacuate low-lying areas" />
        </div>

        <div>
          <label className="text-[11px] text-slate-500">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full mt-1 bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200" />
        </div>

        {error && <p className="text-[11px] text-risk-critical">{error}</p>}

        <button onClick={submit} disabled={sending} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-lg">
          <Send className="w-3.5 h-3.5" /> {sending ? 'Sending…' : 'Send Alert'}
        </button>
      </Card>
    </div>
  )
}

export default function AlertsPage() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationsById, setLocationsById] = useState<Record<string, Location>>({})
  const [tab, setTab] = useState<'ACTIVE' | 'ALL'>('ACTIVE')
  const [showSend, setShowSend] = useState(false)

  const canSend = user?.role === 'DISTRICT_ADMIN' || user?.role === 'STATE_ADMIN' || user?.role === 'CENTRAL_ADMIN'

  useEffect(() => {
    AlertService.list().then(setAlerts)
    LocationService.list().then((locs) => {
      setLocations(locs)
      setLocationsById(Object.fromEntries(locs.map((l) => [l.id, l])))
    })
  }, [])

  const filtered = alerts?.filter((a) => tab === 'ALL' || a.status === 'ACTIVE') ?? []

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Active and historical emergency alerts"
        action={
          canSend ? (
            <button onClick={() => setShowSend(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg">
              <Send className="w-3.5 h-3.5" /> Send Alert
            </button>
          ) : undefined
        }
      />
      <div className="p-6 space-y-4">
        <div className="flex gap-2">
          {(['ACTIVE', 'ALL'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                tab === t ? 'bg-blue-600/15 border-blue-600/40 text-blue-400' : 'bg-base-panel2 border-base-border text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'ACTIVE' ? 'Active Only' : 'All Alerts'}
            </button>
          ))}
        </div>

        {alerts === null && <LoadingState />}
        {alerts !== null && filtered.length === 0 && <EmptyState label="No alerts" />}

        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id} className={`p-4 ${a.severity === 'CRITICAL' ? 'border-risk-critical/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertLevelBadge level={a.level} />
                    <SeverityBadge severity={a.severity} />
                    {a.status === 'RESOLVED' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-400">RESOLVED</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{a.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {locationsById[a.locationId]?.name ?? a.locationId}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {showSend && (
        <SendAlertModal locations={locations} onClose={() => setShowSend(false)} onSent={(a) => setAlerts((prev) => [a, ...(prev ?? [])])} />
      )}
    </div>
  )
}
