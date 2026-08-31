import { useState } from 'react'
import { LocateFixed, X } from 'lucide-react'
import { useAuth } from './AuthContext'
import { UserService } from '../api/service'
import { Card } from './StatusBadges'

const SKIP_KEY = 'onboarding_skipped_for'

// Shown only after the user is already logged in (never blocks login/registration
// itself), and only when their profile is genuinely missing phone or location —
// seeded demo accounts that already have this data never see it.
export default function OnboardingModal() {
  const { user, updateUser } = useAuth()
  const [dismissed, setDismissed] = useState(() => (user ? sessionStorage.getItem(SKIP_KEY) === user.id : false))
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [lat, setLat] = useState<string>('')
  const [lng, setLng] = useState<string>('')
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (!user || user.role !== 'CITIZEN' || dismissed) return null
  const needsPhone = !user.phone
  const needsLocation = !user.location
  if (!needsPhone && !needsLocation) return null

  function skip() {
    if (user) sessionStorage.setItem(SKIP_KEY, user.id)
    setDismissed(true)
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported on this device — enter coordinates manually below.')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5))
        setLng(pos.coords.longitude.toFixed(5))
        setLocating(false)
      },
      () => {
        setLocError('Location permission denied — enter coordinates manually below.')
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  async function save() {
    const parsedLat = needsLocation ? Number(lat) : user!.location?.lat
    const parsedLng = needsLocation ? Number(lng) : user!.location?.lng
    if (needsPhone && !phone.trim()) {
      setSaveError('Phone number is required')
      return
    }
    if (needsLocation && (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng))) {
      setSaveError('Location is required — use "Use my location" or enter coordinates manually')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await UserService.updateMe({
        name: name.trim() || user!.name,
        phone: phone.trim() || user!.phone || '',
        location: { lat: parsedLat as number, lng: parsedLng as number },
      })
      updateUser(updated)
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">Complete your profile</h3>
          <button onClick={skip} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500">
          A phone number and location help us send you relevant alerts and route your reports to the nearest responders.
        </p>

        <div>
          <label className="text-[11px] text-slate-500">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200" />
        </div>

        {needsPhone && (
          <div>
            <label className="text-[11px] text-slate-500">Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className="w-full mt-1 bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200" />
          </div>
        )}

        {needsLocation && (
          <div className="space-y-2">
            <label className="text-[11px] text-slate-500">Location</label>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-600/30 text-xs font-semibold py-2 rounded-lg disabled:opacity-60"
            >
              <LocateFixed className="w-3.5 h-3.5" /> {locating ? 'Locating…' : 'Use my location'}
            </button>
            {locError && <p className="text-[11px] text-risk-moderate">{locError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" className="bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200" />
              <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" className="bg-base-panel2 border border-base-border rounded-md text-xs px-2 py-2 text-slate-200" />
            </div>
          </div>
        )}

        {saveError && <p className="text-[11px] text-risk-critical">{saveError}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={skip} className="flex-1 text-xs font-semibold py-2 rounded-lg border border-base-border text-slate-400 hover:text-slate-200">
            Skip for now
          </button>
          <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-lg">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Card>
    </div>
  )
}
