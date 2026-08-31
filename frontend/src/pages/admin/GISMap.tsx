import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Search, X, Loader2 } from 'lucide-react'
import { ClusterService, LocationService, PredictionService, PopulationService } from '../../api/service'
import { geocodeSearch } from '../../api/geocode'
import type { IncidentCluster, Location, Prediction, Population, Severity } from '../../types'
import { PageHeader } from '../../components/PageHeader'
import { Card, LoadingState, SeverityBadge } from '../../components/StatusBadges'

const severityColor: Record<Severity, string> = {
  LOW: '#22c55e',
  MODERATE: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#dc2626',
}

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

export default function GISMap() {
  const [locations, setLocations] = useState<Location[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Location | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [pop, setPop] = useState<Population | null>(null)
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
    setPop(null)
    PredictionService.getForLocation(selected.id).then(setPrediction)
    PopulationService.getForLocation(selected.id).then(setPop)
  }, [selected])

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

  const center = useMemo<[number, number]>(() => [25.8, 92.5], [])

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title="GIS Risk Map"
        subtitle="Interactive landslide risk visualization — Northeast India"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                {searching ? (
                  <Loader2 className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                )}
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="Search location, district, state…"
                  className="w-full bg-base-panel2 border border-base-border rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-600/60"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !query.trim()}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg"
              >
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Search
              </button>
            </div>
          </div>
        }
      />

      <div className="flex-1 relative flex overflow-hidden">
        <div className="flex-1 p-4 relative">
          <MapContainer center={center} zoom={7} className="w-full h-full rounded-xl">
            <TileLayer
              url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
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
                  <div className="text-[11px] text-slate-500">Risk: {loc.riskScore}/100</div>
                </Popup>
              </CircleMarker>
            ))}
            {clusters.map((cluster) => (
              <Circle key={cluster.id} center={[cluster.center.lat, cluster.center.lng]} radius={Math.max(350, cluster.count * 250)} pathOptions={{ color: severityColor[cluster.severity], fillColor: severityColor[cluster.severity], fillOpacity: 0.18, weight: 1 }}>
                <Popup><div className="text-xs"><b>Incident cluster: {cluster.count}</b><br />Center: {cluster.center.lat.toFixed(4)}, {cluster.center.lng.toFixed(4)}<br />Severity: {cluster.severity}<br />Incidents: {cluster.incidents.length}</div></Popup>
              </Circle>
            ))}
            {searchedPoint && (
              <Marker position={[searchedPoint.lat, searchedPoint.lng]} icon={searchPinIcon}>
                <Popup><div className="text-xs">{searchedPoint.label}</div></Popup>
              </Marker>
            )}
            <FocusOnSearch locations={locations} query={query} focusPoint={searchedPoint} />
          </MapContainer>

          {/* Legend — always visible so severity colors read on their own */}
          <div className="absolute bottom-8 left-8 bg-base-panel/95 border border-base-border rounded-lg px-3 py-2.5 space-y-1.5 shadow-lg z-[1000]">
            <p className="text-[10px] font-semibold text-slate-400 mb-1">Risk Severity</p>
            {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as Severity[]).map((s) => (
              <div key={s} className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: severityColor[s] }} />
                {s}
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <div className="w-80 shrink-0 border-l border-base-border bg-base-panel overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-base-border">
              <h3 className="text-sm font-bold text-slate-100">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{selected.district}, {selected.state}</span>
                <SeverityBadge severity={selected.severity} />
              </div>

              {!prediction ? (
                <LoadingState label="Loading risk model…" />
              ) : (
                <>
                  <Card className="p-3.5">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Risk Forecast</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        ['Now', prediction.forecast.current],
                        ['+6h', prediction.forecast.plus6h],
                        ['+12h', prediction.forecast.plus12h],
                      ].map(([label, val]) => (
                        <div key={label as string} className="bg-base-panel2 rounded-lg py-2">
                          <p className="text-sm font-bold text-slate-100">{val}</p>
                          <p className="text-[10px] text-slate-500">{label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">Model confidence: {prediction.confidence}%</p>
                  </Card>

                  <Card className="p-3.5">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Contributing Factors</p>
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
                  </Card>

                  {pop && (
                    <Card className="p-3.5">
                      <p className="text-xs font-semibold text-slate-400 mb-2">Population Impact</p>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-base-panel2 rounded-lg py-2">
                          <p className="text-sm font-bold text-slate-100">{pop.affectedPopulation.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500">People</p>
                        </div>
                        <div className="bg-base-panel2 rounded-lg py-2">
                          <p className="text-sm font-bold text-slate-100">{pop.villages}</p>
                          <p className="text-[10px] text-slate-500">Villages</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}