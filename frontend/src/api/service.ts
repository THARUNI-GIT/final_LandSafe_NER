// Real backend integration layer.
// UI -> service (this file, normalizes backend shapes) -> httpClient -> Express API
import { httpClient } from './client'
import type {
  Location, Incident, Alert, TaskForce, Road, Infrastructure,
  Population, User, Prediction, Dashboard, AssistantResponse, SOSRequest, Severity, IncidentCluster,
} from '../types'

function id(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  return v._id || v.id || ''
}

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise
  return res.data.data
}

// ---------- normalizers ----------
const severityFromLevel: Record<Severity, 'NORMAL' | 'WATCH' | 'PREPARE' | 'EVACUATE'> = {
  LOW: 'NORMAL', MODERATE: 'WATCH', HIGH: 'PREPARE', CRITICAL: 'EVACUATE',
}

function normLocation(l: any, predictionByLoc: Map<string, any>): Location {
  const pred = predictionByLoc.get(id(l))
  return {
    id: id(l),
    name: l.name,
    district: l.district,
    state: l.state,
    latitude: l.lat,
    longitude: l.lng,
    riskScore: pred?.riskScore ?? 0,
    severity: (pred?.severity ?? 'LOW') as Severity,
  }
}

function normPrediction(p: any): Prediction {
  return {
    locationId: id(p.locationId),
    riskScore: p.riskScore,
    severity: p.severity,
    confidence: p.confidence,
    factors: (p.factors || []).map((f: any) => ({ name: f.name, contribution: (f.contributionPct ?? 0) / 100 })),
    forecast: {
      current: p.current?.riskScore ?? p.riskScore,
      plus6h: p.forecast6h?.riskScore ?? p.riskScore,
      plus12h: p.forecast12h?.riskScore ?? p.riskScore,
    },
  }
}

function normIncident(i: any): Incident {
  const img = (i.images || [])[0]
  const statusMap: Record<string, Incident['status']> = {
    PENDING: 'REPORTED', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED', RESOLVED: 'RESOLVED',
  }
  return {
    id: id(i),
    locationId: id(i.locationId),
    locationName: typeof i.locationId === 'object' ? i.locationId?.name : undefined,
    district: typeof i.locationId === 'object' ? i.locationId?.district : undefined,
    state: typeof i.locationId === 'object' ? i.locationId?.state : undefined,
    reporterId: id(i.reportedBy),
    reporterName: typeof i.reportedBy === 'object' ? i.reportedBy?.name : undefined,
    reporterEmail: typeof i.reportedBy === 'object' ? i.reportedBy?.email : undefined,
    imageUrl: img?.url || 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600',
    latitude: i.gps?.lat,
    longitude: i.gps?.lng,
    timestamp: i.createdAt || new Date().toISOString(),
    description: i.description,
    verification: {
      classification: img?.verificationStatus || 'PENDING',
      confidence: img?.verificationConfidence ?? 0,
      severity: i.severityGuess || 'MODERATE',
    },
    status: statusMap[i.status] || 'REPORTED',
    clusterId: i.clusterId ?? null,
  }
}

function normAlert(a: any): Alert {
  return {
    id: id(a),
    locationId: id((a.locationIds || [])[0]),
    severity: a.severity,
    level: severityFromLevel[a.severity as Severity] || 'WATCH',
    title: a.title,
    message: a.message,
    timestamp: a.createdAt || new Date().toISOString(),
    status: a.active ? 'ACTIVE' : 'RESOLVED',
  }
}

function normTaskForce(t: any, distanceKm?: number, etaMinutes?: number, reason?: string): TaskForce {
  return {
    id: id(t),
    name: t.name,
    location: t.district || `${t.currentLocation?.lat?.toFixed(2)}, ${t.currentLocation?.lng?.toFixed(2)}`,
    availability: t.status === 'UNAVAILABLE' ? 'STANDBY' : t.status,
    eta: etaMinutes ?? 0,
    distance: distanceKm ?? 0,
    resources: t.resources || [],
    capability: t.type,
    recommendationReason: reason,
  }
}

function roadRisk(status: string): Severity {
  if (status === 'DAMAGED') return 'CRITICAL'
  if (status === 'BLOCKED') return 'HIGH'
  return 'LOW'
}

function normRoad(r: any): Road {
  const statusMap: Record<string, Road['status']> = { OPEN: 'OPEN', BLOCKED: 'BLOCKED', DAMAGED: 'DANGEROUS' }
  return {
    id: id(r),
    name: r.name,
    locationId: id(r.startLocationId),
    status: statusMap[r.status] || 'OPEN',
    risk: roadRisk(r.status),
    alternateRoute: undefined,
  }
}

function normInfra(i: any): Infrastructure {
  return {
    id: id(i),
    name: i.name,
    type: i.type,
    locationId: id(i.locationId),
    locationName: typeof i.locationId === 'object' ? i.locationId?.name : undefined,
    district: typeof i.locationId === 'object' ? i.locationId?.district : undefined,
    state: typeof i.locationId === 'object' ? i.locationId?.state : undefined,
    status: i.status || 'OPERATIONAL',
    distanceFromRiskZone: 0,
  }
}

function normPopulation(p: any): Population {
  const pct: Record<string, number> = { LOW: 15, MODERATE: 40, HIGH: 70, CRITICAL: 95 }
  return {
    locationId: id(p.locationId),
    affectedPopulation: p.population || 0,
    villages: p.householdCount || 0,
    riskPercentage: pct[p.riskLevel] ?? 20,
  }
}

function normSOS(s: any): SOSRequest {
  return {
    id: id(s),
    userId: id(s.userId),
    reporterName: typeof s.userId === 'object' ? s.userId?.name : undefined,
    reporterPhone: typeof s.userId === 'object' ? s.userId?.phone : undefined,
    latitude: s.gps?.lat,
    longitude: s.gps?.lng,
    message: s.description || '',
    timestamp: s.createdAt || new Date().toISOString(),
    district: s.district ?? null,
    state: s.state ?? null,
    assignedTaskForceId: s.assignedTaskForceId ? id(s.assignedTaskForceId) : null,
    status: s.status,
  }
}

function normUser(u: any): User {
  return {
    id: id(u),
    name: u.name,
    email: u.email,
    role: u.role,
    district: u.district,
    state: u.state,
    phone: u.phone,
    location: u.location && Number.isFinite(u.location.lat) && Number.isFinite(u.location.lng) ? { lat: u.location.lat, lng: u.location.lng } : undefined,
  }
}

async function predictionMap(): Promise<Map<string, any>> {
  const preds = await unwrap<any[]>(httpClient.get('/predictions?limit=500'))
  const map = new Map<string, any>()
  preds.forEach((p) => map.set(id(p.locationId), p))
  return map
}

// ---------- services ----------
export const AuthService = {
  login: async (email: string, password: string) => {
    const data = await unwrap<{ token: string; user: any }>(httpClient.post('/auth/login', { email, password }))
    return { token: data.token, user: normUser(data.user) }
  },
  getMe: async () => normUser(await unwrap<any>(httpClient.get('/auth/me'))),
  googleLoginUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/google`,
}

export const LocationService = {
  list: async () => {
    const [locs, preds] = await Promise.all([unwrap<any[]>(httpClient.get('/locations')), predictionMap()])
    return locs.map((l) => normLocation(l, preds))
  },
  search: async (q: string) => {
    const [locs, preds] = await Promise.all([unwrap<any[]>(httpClient.get(`/locations/search?q=${encodeURIComponent(q)}`)), predictionMap()])
    return locs.map((l) => normLocation(l, preds))
  },
  getById: async (locId: string) => {
    const [l, preds] = await Promise.all([unwrap<any>(httpClient.get(`/locations/${locId}`)), predictionMap()])
    return normLocation(l, preds)
  },
}

export const PredictionService = {
  getForLocation: async (locationId: string) => normPrediction(await unwrap<any>(httpClient.get(`/predictions/${locationId}`))),
  create: async (locationId: string) => normPrediction(await unwrap<any>(httpClient.post(`/predictions/generate/${locationId}`))),
}

export const IncidentService = {
  list: async () => (await unwrap<any[]>(httpClient.get('/incidents'))).map(normIncident),
  getById: async (incId: string) => normIncident(await unwrap<any>(httpClient.get(`/incidents/${incId}`))),
  create: async (payload: { locationId: string; imageUrl: string; latitude: number; longitude: number; description: string }) => {
    const body = {
      locationId: payload.locationId,
      description: payload.description,
      gps: { lat: payload.latitude, lng: payload.longitude },
      images: payload.imageUrl ? [{ url: payload.imageUrl }] : [],
    }
    return normIncident(await unwrap<any>(httpClient.post('/incidents', body)))
  },
  update: async (incId: string, patch: { status?: string }) =>
    normIncident(await unwrap<any>(httpClient.patch(`/incidents/${incId}/status`, patch))),
}

export const ClusterService = {
  list: async (): Promise<IncidentCluster[]> => (await unwrap<any[]>(httpClient.get('/incidents/clusters/geographic'))).map((cluster) => ({
    id: cluster.id,
    center: cluster.center,
    count: cluster.count,
    severity: cluster.severity,
    incidents: (cluster.incidents || []).map(normIncident),
  })),
}

export const AlertService = {
  list: async () => (await unwrap<any[]>(httpClient.get('/alerts'))).map(normAlert),
  active: async () => (await unwrap<any[]>(httpClient.get('/alerts?active=true'))).map(normAlert),
  create: async (payload: { title: string; message: string; severity: Severity; locationIds?: string[]; district?: string; state?: string; expiresAt?: string }) =>
    normAlert(await unwrap<any>(httpClient.post('/alerts', payload))),
  deactivate: async (alertId: string) => normAlert(await unwrap<any>(httpClient.patch(`/alerts/${alertId}/deactivate`, {}))),
}

export const TaskForceService = {
  list: async () => (await unwrap<any[]>(httpClient.get('/taskforces'))).map((t) => normTaskForce(t)),
  recommended: async (incidentId: string) => {
    const ranked = await unwrap<any[]>(httpClient.get(`/taskforces/recommend/${incidentId}`))
    return ranked.map((r) => normTaskForce(r.taskForce, r.distanceKm, r.etaMinutes, 'Nearest available unit'))
  },
  assign: async (taskForceId: string, incidentId: string) =>
    normTaskForce(await unwrap<any>(httpClient.post(`/taskforces/${taskForceId}/assign`, { incidentId }))),
  updateStatus: async (taskForceId: string, status: string) =>
    normTaskForce(await unwrap<any>(httpClient.patch(`/taskforces/${taskForceId}`, { status }))),
}

export const RoadService = {
  list: async () => (await unwrap<any[]>(httpClient.get('/roads'))).map(normRoad),
  affected: async (locationId: string) =>
    (await unwrap<any[]>(httpClient.get('/roads'))).map(normRoad).filter((r) => r.locationId === locationId),
  updateStatus: async (roadId: string, status: 'OPEN' | 'BLOCKED' | 'DAMAGED') =>
    normRoad(await unwrap<any>(httpClient.patch(`/roads/${roadId}`, { status }))),
}

export const InfrastructureService = {
  list: async (locationId?: string) =>
    (await unwrap<any[]>(httpClient.get(locationId ? `/infrastructure?locationId=${locationId}` : '/infrastructure'))).map(normInfra),
  updateStatus: async (infraId: string, status: 'OPERATIONAL' | 'DAMAGED' | 'DESTROYED') =>
    normInfra(await unwrap<any>(httpClient.patch(`/infrastructure/${infraId}`, { status }))),
}

export const PopulationService = {
  getForLocation: async (locationId: string) => {
    try {
      return normPopulation(await unwrap<any>(httpClient.get(`/population/${locationId}`)))
    } catch {
      return null
    }
  },
}

export const SOSService = {
  create: async (payload: { latitude: number; longitude: number; message: string }) =>
    normSOS(await unwrap<any>(httpClient.post('/sos', { gps: { lat: payload.latitude, lng: payload.longitude }, description: payload.message }))),
  list: async () => (await unwrap<any[]>(httpClient.get('/sos'))).map(normSOS),
  update: async (id: string, patch: { status?: 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED'; assignedTaskForceId?: string }) => normSOS(await unwrap<any>(httpClient.patch(`/sos/${id}`, patch))),
}

export const UserService = {
  updateMe: async (payload: { name: string; phone: string; location: { lat: number; lng: number } }) => normUser(await unwrap<any>(httpClient.put('/users/me', payload))),
}

function toDashboard(stats: any, riskTrend: { time: string; riskScore: number }[] = []): Dashboard {
  return {
    criticalLocations: 0,
    highRiskLocations: stats.highRiskLocations || 0,
    activeAlerts: stats.activeAlerts || 0,
    populationAtRisk: stats.populationTotal || 0,
    activeIncidents: stats.incidentCount || 0,
    availableTaskForces: stats.availableTaskForces || 0,
    riskTrend,
  }
}

export const DashboardService = {
  get: async () => toDashboard(await unwrap<any>(httpClient.get('/dashboard/central'))),
  district: async (districtId: string) => toDashboard(await unwrap<any>(httpClient.get(`/dashboard/district/${districtId}`))),
  state: async (stateId: string) => toDashboard(await unwrap<any>(httpClient.get(`/dashboard/state/${stateId}`))),
  central: async () => toDashboard(await unwrap<any>(httpClient.get('/dashboard/central'))),
}

// Uses the REAL backend /assistant/* endpoints (no fake LLM). We route the
// question to the relevant endpoint(s) and compose a grounded answer.
export const AssistantService = {
  query: async (question: string): Promise<AssistantResponse> => {
    const q = question.toLowerCase()
    const summary = await unwrap<any>(httpClient.get('/assistant/summary'))

    if (q.includes('evacuat') || q.includes('critical')) {
      const districts = await unwrap<any[]>(httpClient.get('/assistant/critical-districts'))
      return {
        answer: districts.length
          ? `${districts.length} district(s) currently show CRITICAL/HIGH risk predictions, led by ${districts[0].district}, ${districts[0].state} (avg risk score ${districts[0].avgRiskScore}).`
          : 'No districts currently show CRITICAL or HIGH risk predictions.',
        supportingData: districts.slice(0, 5).map((d) => `${d.district}, ${d.state}: ${d.criticalCount} critical, ${d.highCount} high (avg ${d.avgRiskScore})`),
        recommendedActions: ['Review top districts for evacuation readiness', 'Coordinate with district admins on active alerts'],
      }
    }
    if (q.includes('task force') || q.includes('resource')) {
      const tfs = await unwrap<any[]>(httpClient.get('/assistant/available-taskforces'))
      return {
        answer: `${tfs.length} task force(s) are currently AVAILABLE for deployment.`,
        supportingData: tfs.slice(0, 5).map((t: any) => `${t.name} (${t.type}) — ${t.district || 'unassigned district'}`),
        recommendedActions: ['Assign nearest available task force to open incidents', 'Confirm resource readiness'],
      }
    }
    if (q.includes('road')) {
      const roads = await unwrap<any[]>(httpClient.get('/assistant/blocked-roads'))
      return {
        answer: `${roads.length} road(s) are currently BLOCKED or DAMAGED.`,
        supportingData: roads.slice(0, 5).map((r: any) => `${r.name} — ${r.status}`),
        recommendedActions: ['Redirect traffic via alternate routes', 'Deploy road-clearance crews'],
      }
    }
    if (q.includes('population')) {
      const zones = await unwrap<any[]>(httpClient.get('/assistant/population-at-risk'))
      const total = zones.reduce((s: number, z: any) => s + (z.population || 0), 0)
      return {
        answer: `${total.toLocaleString()} people across ${zones.length} zone(s) are in HIGH/CRITICAL risk areas.`,
        supportingData: zones.slice(0, 5).map((z: any) => `${z.locationId?.name || 'Unknown'}: ${z.population} people (${z.riskLevel})`),
        recommendedActions: ['Prioritize shelter capacity in these zones', 'Issue targeted public advisories'],
      }
    }

    return {
      answer: `Regional snapshot: ${summary.criticalDistrictsCount} critical-severity predictions, ${summary.activeIncidents} active incidents, ${summary.availableTaskForces} task forces available, ${summary.blockedRoads} roads blocked.`,
      supportingData: (summary.topRiskLocations || []).slice(0, 5).map((p: any) => `${p.locationId?.name || 'Unknown'}: risk ${p.riskScore} (${p.severity})`),
      recommendedActions: ['Monitor top risk locations closely', 'Pre-position resources near highest-risk zones'],
    }
  },
}
