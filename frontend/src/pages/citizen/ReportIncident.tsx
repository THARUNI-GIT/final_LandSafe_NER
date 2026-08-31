import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, MapPin, Send, CheckCircle2 } from 'lucide-react'
import { IncidentService, LocationService } from '../../api/service'
import type { Location } from '../../types'
import { Card } from '../../components/StatusBadges'

export default function ReportIncident() {
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState('')
  const [description, setDescription] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    LocationService.list().then((locs) => {
      setLocations(locs)
      setLocationId(locs[0]?.id ?? '')
    })
  }, [])

  function handleImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await IncidentService.create({
        locationId,
        imageUrl: preview ?? 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600',
        latitude: coords?.lat ?? 26.06,
        longitude: coords?.lng ?? 91.93,
        description,
      })
      setSubmitted(true)
      setTimeout(() => navigate('/citizen/history'), 1400)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <CheckCircle2 className="w-14 h-14 text-risk-low mb-4" />
        <p className="text-base font-semibold text-slate-100">Report Submitted</p>
        <p className="text-sm text-slate-500 mt-1">Our AI verification pipeline is reviewing your report</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-slate-100">Report Incident</h1>
        <p className="text-sm text-slate-500">Help us verify and respond faster</p>
      </div>

      <Card className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Photo Evidence</label>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-base-border rounded-xl h-40 cursor-pointer hover:border-blue-600/50 transition-colors overflow-hidden">
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Camera className="w-6 h-6 text-slate-500" />
                <span className="text-xs text-slate-500">Tap to upload photo</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Nearest Location</label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full bg-base-panel2 border border-base-border rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-600/60"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}, {l.district}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">GPS Location</label>
          <button
            type="button"
            onClick={handleGetLocation}
            className="w-full flex items-center justify-center gap-2 bg-base-panel2 hover:bg-base-panel2/70 border border-base-border rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors"
          >
            <MapPin className="w-4 h-4 text-blue-500" />
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Capture current location'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Describe what you're observing — cracks, debris, water flow, sounds…"
            className="w-full bg-base-panel2 border border-base-border rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60 resize-none"
          />
        </div>
      </Card>

      <button
        type="submit"
        disabled={submitting || !description}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors text-white font-semibold text-sm py-3 rounded-lg"
      >
        <Send className="w-4 h-4" />
        {submitting ? 'Submitting…' : 'Submit Report'}
      </button>
    </form>
  )
}
