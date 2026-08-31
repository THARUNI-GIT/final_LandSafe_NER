import { useState } from 'react'
import { Siren, MapPin, CheckCircle2 } from 'lucide-react'
import { SOSService } from '../../api/service'
import { Card } from '../../components/StatusBadges'

export default function SOSPage() {
  const [message, setMessage] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setCoords({ lat: 26.06, lng: 91.93 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 26.06, lng: 91.93 })
    )
  }

  async function handleSend() {
    setSending(true)
    try {
      await SOSService.create({
        latitude: coords?.lat ?? 26.06,
        longitude: coords?.lng ?? 91.93,
        message: message || 'Emergency assistance needed',
      })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <CheckCircle2 className="w-14 h-14 text-risk-low mb-4" />
        <p className="text-base font-semibold text-slate-100">SOS Sent</p>
        <p className="text-sm text-slate-500 mt-1 text-center max-w-xs">
          Emergency responders have been notified of your location. Stay where you are if it's safe to do so.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="relative mb-4">
          <div className="pulse-ring text-risk-critical absolute w-16 h-16" />
          <div className="relative w-16 h-16 rounded-full bg-risk-critical/20 flex items-center justify-center">
            <Siren className="w-8 h-8 text-risk-critical" />
          </div>
        </div>
        <h1 className="text-lg font-bold text-slate-100">Emergency SOS</h1>
        <p className="text-sm text-slate-500 max-w-xs mt-1">
          This will alert nearby task forces and district authorities with your live location
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <button
          onClick={handleGetLocation}
          className="w-full flex items-center justify-center gap-2 bg-base-panel2 hover:bg-base-panel2/70 border border-base-border rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors"
        >
          <MapPin className="w-4 h-4 text-blue-500" />
          {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Share my current location'}
        </button>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Briefly describe your emergency (optional)"
          className="w-full bg-base-panel2 border border-base-border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60 resize-none"
        />
      </Card>

      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 bg-risk-critical hover:bg-risk-critical/90 disabled:opacity-50 transition-colors text-white font-bold text-sm py-3.5 rounded-lg"
      >
        <Siren className="w-4 h-4" />
        {sending ? 'Sending SOS…' : 'Send SOS Now'}
      </button>
    </div>
  )
}
