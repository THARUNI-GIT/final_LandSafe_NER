export type Role = 'CITIZEN' | 'DISTRICT_ADMIN' | 'STATE_ADMIN' | 'CENTRAL_ADMIN'

export type Severity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

export type AlertLevel = 'NORMAL' | 'WATCH' | 'PREPARE' | 'EVACUATE'

export type RoadStatus = 'OPEN' | 'PARTIALLY_BLOCKED' | 'BLOCKED' | 'DANGEROUS'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  district?: string
  state?: string
  phone?: string
  location?: { lat: number; lng: number }
}

export interface Location {
  id: string
  name: string
  district: string
  state: string
  latitude: number
  longitude: number
  riskScore: number
  severity: Severity
}

export interface PredictionFactor {
  name: string
  contribution: number
}

export interface Prediction {
  locationId: string
  riskScore: number
  severity: Severity
  confidence: number
  factors: PredictionFactor[]
  forecast: {
    current: number
    plus6h: number
    plus12h: number
  }
}

export interface IncidentVerification {
  classification: string
  confidence: number
  severity: Severity
}

export type IncidentStatus = 'REPORTED' | 'VERIFIED' | 'RESPONDING' | 'RESOLVED' | 'REJECTED'

export interface Incident {
  id: string
  locationId: string
  locationName?: string
  district?: string
  state?: string
  reporterId: string
  reporterName?: string
  reporterEmail?: string
  imageUrl: string
  latitude: number
  longitude: number
  timestamp: string
  description: string
  verification: IncidentVerification
  status: IncidentStatus
  clusterId?: string | null
}

export interface Alert {
  id: string
  locationId: string
  severity: Severity
  level: AlertLevel
  title: string
  message: string
  timestamp: string
  status: 'ACTIVE' | 'RESOLVED'
}

export interface TaskForce {
  id: string
  name: string
  location: string
  availability: 'AVAILABLE' | 'DEPLOYED' | 'STANDBY'
  eta: number
  distance: number
  resources: string[]
  capability: string
  recommendationReason?: string
}

export interface Road {
  id: string
  name: string
  locationId: string
  status: RoadStatus
  risk: Severity
  alternateRoute?: string
}

export interface Infrastructure {
  id: string
  name: string
  type: 'HOSPITAL' | 'SCHOOL' | 'BRIDGE' | 'POWER' | 'SHELTER' | 'GOVT_OFFICE'
  locationId: string
  locationName?: string
  district?: string
  state?: string
  status: 'OPERATIONAL' | 'DAMAGED' | 'DESTROYED'
  distanceFromRiskZone: number
}

export interface Population {
  locationId: string
  affectedPopulation: number
  villages: number
  riskPercentage: number
}

export interface Dashboard {
  criticalLocations: number
  highRiskLocations: number
  activeAlerts: number
  populationAtRisk: number
  activeIncidents: number
  availableTaskForces: number
  riskTrend: { time: string; riskScore: number }[]
}

export interface AssistantResponse {
  answer: string
  supportingData: string[]
  recommendedActions: string[]
}

export interface SOSRequest {
  id: string
  userId: string
  reporterName?: string
  reporterPhone?: string
  latitude: number
  longitude: number
  message: string
  timestamp: string
  district?: string | null
  state?: string | null
  assignedTaskForceId?: string | null
  status: 'PENDING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED' | 'CANCELLED'
}

export interface IncidentCluster {
  id: string
  center: { lat: number; lng: number }
  count: number
  severity: Severity
  incidents: Incident[]
}
