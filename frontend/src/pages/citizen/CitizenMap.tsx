import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Circle, useMap } from 'react-leaflet'
import { Search, X, LocateFixed, Loader2 } from 'lucide-react'
import L from 'leaflet'
import { ClusterService, LocationService, PredictionService } from '../../api/service'
import { geocodeSearch } from '../../api/geocode'
import type { IncidentCluster, Location, Prediction, Severity } from '../../types'
import { Card, LoadingState, SeverityBadge } from '../../components/StatusBadges'
import { useLanguage } from '../../i18n/LanguageContext'

const severityColor: Record<Severity, string> = {
  LOW: '#22c55e',
  MODERATE: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#dc2626',
}

const meIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.35)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const searchPinIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Pans/zooms the map to the current search results (or a geocoded fallback
// point) so a search visibly does something.
function FocusOnSearch({
  locations,
  query,
  focusPoint,
}: {
  locations: Location[]
  query: string
  focusPoint: { lat: number; lng: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    if (focusPoint) {
      map.flyTo([focusPoint.lat, focusPoint.lng], 11, { duration: 0.8 })
      return
    }
    if (!query || locations.length === 0) return
    if (locations.length === 1) {
      map.flyTo([locations[0].latitude, locations[0].longitude], 11, { duration: 0.8 })
    } else {
      const bounds = locations.map((l) => [l.latitude, l.longitude] as [number, number])
      map.flyToBounds(bounds, { padding: [60, 60], duration: 0.8 })
    }
  }, [query, locations, focusPoint, map])
  return null
}

export default function CitizenMap() {
  const { t } = useLanguage()
  const [locations, setLocations] = useState<Location[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Location | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [myPos, setMyPos] = useState<[number, number] | null>(null)
  const [clusters, setClusters] = useState<IncidentCluster[]>([])
  // Set only when a search matches no location in our own database — holds
  // a geocoded fallback point (and label) so the map can still zoom there.
  const [searchedPoint, setSearchedPoint] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    LocationService.list().then(setLocations)
    ClusterService.list().then(setClusters).catch(() => setClusters([]))
  }, [])

  useEffect(() => {
    if (!query) {
      LocationService.list().then(setLocations)
      setSearchedPoint(null)
      return
    }
    const handle = setTimeout(() => {
      LocationService.search(query).then((res) => {
        setLocations(res)
        if (res.length > 0) setSearchedPoint(null)
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    if (!selected) return
    setPrediction(null)
    PredictionService.getForLocation(selected.id).then(setPrediction).catch(() => setPrediction(null))
  }, [selected])

  function locateMe() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => setMyPos([26.06, 91.93])
    )
  }

  // Explicit search action (Enter key / clicking the search icon): looks up
  // our own locations first; if nothing matches, falls back to a free
  // keyless geocoder so a district/city name still zooms the map somewhere.
  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const results = await LocationService.search(query)
      setLocations(results)
      if (results.length > 0) {
        setSearchedPoint(null)
        return
      }
      const geo = await geocodeSearch(query)
      setSearchedPoint(geo)
    } finally {
      setSearching(false)
    }
  }

  const center = useMemo<[number, number]>(() => myPos ?? [25.8, 92.5], [myPos])

  return (
    <div className="space-y-3 animate-fade-in -mx-4 sm:-mx-6 -my-5">
      <div className="px-4 sm:px-6 pt-1">
        <h1 className="text-lg font-bold text-slate-100">{t('gisMap')}</h1>
        <p className="text-sm text-slate-500">{t('gisMapSubtitle')}</p>
      </div>

      <div className="px-4 sm:px-6 flex items-center gap-2">
        <div className="relative flex-1">
          {searching ? (
            <Loader2 className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-base-panel2 border border-base-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2.5 rounded-lg"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
        <button
          onClick={locateMe}
          className="shrink-0 flex items-center gap-1.5 bg-base-panel2 hover:bg-base-panel2/70 border border-base-border rounded-lg px-3 py-2.5 text-xs text-slate-300 transition-colors"
        >
          <LocateFixed className="w-4 h-4 text-blue-500" />
        </button>
      </div>

      <div className="px-4 sm:px-6">
        <div className="h-[52vh] rounded-xl overflow-hidden border border-base-border">
          <MapContainer center={center} zoom={myPos ? 10 : 7} className="w-full h-full">
            <TileLayer
              url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            {myPos && <Marker position={myPos} icon={meIcon} />}
            {locations.map((loc) => (
              <CircleMarker
                key={loc.id}
                center={[loc.latitude, loc.longitude]}
                radius={8 + loc.riskScore / 12}
                pathOptions={{
                  color: severityColor[loc.severity],
                  fillColor: severityColor[loc.severity],
                  fillOpacity: 0.45,
                  weight: 2,
                }}
                eventHandlers={{ click: () => setSelected(loc) }}
              >
                <Popup>
                  <div className="text-xs font-medium">{loc.name}</div>
                  <div className="text-[11px] text-slate-500">{t('riskScore')}: {loc.riskScore}/100</div>
                </Popup>
              </CircleMarker>
            ))}
            {clusters.map((cluster) => (
              <Circle key={cluster.id} center={[cluster.center.lat, cluster.center.lng]} radius={Math.max(350, cluster.count * 250)} pathOptions={{ color: severityColor[cluster.severity], fillColor: severityColor[cluster.severity], fillOpacity: 0.16, weight: 1 }}>
                <Popup><div className="text-xs"><b>{cluster.count} nearby reports</b><br />{cluster.severity} cluster</div></Popup>
              </Circle>
            ))}
            {searchedPoint && (
              <Marker position={[searchedPoint.lat, searchedPoint.lng]} icon={searchPinIcon}>
                <Popup><div className="text-xs">{searchedPoint.label}</div></Popup>
              </Marker>
            )}
            <FocusOnSearch locations={locations} query={query} focusPoint={searchedPoint} />
          </MapContainer>
        </div>
      </div>

      {selected && (
        <div className="px-4 sm:px-6 pb-4">
          <Card className="p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">{selected.district}, {selected.state}</span>
              <SeverityBadge severity={selected.severity} />
            </div>

            {!prediction ? (
              <LoadingState label="Loading risk model…" />
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-400 mb-2">{t('riskForecast')}</p>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[
                    [t('now'), prediction.forecast.current],
                    ['+6h', prediction.forecast.plus6h],
                    ['+12h', prediction.forecast.plus12h],
                  ].map(([label, val]) => (
                    <div key={label as string} className="bg-base-panel2 rounded-lg py-2">
                      <p className="text-sm font-bold text-slate-100">{val}</p>
                      <p className="text-[10px] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mb-3">{t('modelConfidence')}: {prediction.confidence}%</p>

                <p className="text-xs font-semibold text-slate-400 mb-2">{t('contributingFactors')}</p>
                <div className="space-y-2">
                  {prediction.factors.map((f) => (
                    <div key={f.name}>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                        <span>{f.name}</span>
                        <span>{Math.round(f.contribution * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-base-panel2 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${f.contribution * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}