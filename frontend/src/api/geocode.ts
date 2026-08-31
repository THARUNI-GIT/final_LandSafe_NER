// Free, keyless geocoding fallback for map search — used only when a typed
// district/city name has no match among our own Location records. Uses
// OpenStreetMap's Nominatim service (same OSM data already attributed on
// the map tiles), biased to India. No Google Maps, no API key required.
export interface GeocodeResult {
  lat: number
  lng: number
  label: string
}

export async function geocodeSearch(query: string): Promise<GeocodeResult | null> {
  const q = query.trim()
  if (!q) return null
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const top = data[0]
    const lat = parseFloat(top.lat)
    const lng = parseFloat(top.lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return { lat, lng, label: top.display_name as string }
  } catch {
    return null
  }
}