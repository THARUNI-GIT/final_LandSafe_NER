/**
 * MOCK RISK ENGINE
 * Replace this module's internals with a real ML model call later.
 * Contract (inputs/outputs) must remain stable for the frontend.
 */

export type Severity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface ForecastPoint {
  riskScore: number; // 0-100
  severity: Severity;
}

export interface RiskFactor {
  name: string;
  contributionPct: number;
}

export interface RiskResult {
  riskScore: number;
  severity: Severity;
  confidence: number;
  factors: RiskFactor[];
  current: ForecastPoint;
  forecast6h: ForecastPoint;
  forecast12h: ForecastPoint;
  modelVersion: string;
}

// simple deterministic hash so the same location always gets a stable base score
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function scoreToSeverity(score: number): Severity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MODERATE";
  return "LOW";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function generateMockRisk(locationId: string, rainfallMm = 0, soilMoisturePct = 0, slopeAngleDeg = 0): RiskResult {
  const seed = hashSeed(locationId);
  const rand = (offset: number) => ((seed + offset) % 100) / 100; // 0-1 deterministic pseudo-random

  const base = 20 + rand(1) * 40; // 20-60 baseline
  const rainfallEffect = clamp(rainfallMm / 5, 0, 25);
  const soilEffect = clamp(soilMoisturePct / 5, 0, 15);
  const slopeEffect = clamp(slopeAngleDeg / 3, 0, 15);

  const currentScore = clamp(Math.round(base + rainfallEffect + soilEffect + slopeEffect), 0, 100);
  const forecast6Score = clamp(Math.round(currentScore + (rand(2) - 0.3) * 15), 0, 100);
  const forecast12Score = clamp(Math.round(forecast6Score + (rand(3) - 0.3) * 20), 0, 100);

  const confidence = clamp(Math.round(65 + rand(4) * 30), 40, 98);

  const factors: RiskFactor[] = [
    { name: "Rainfall Intensity", contributionPct: Math.round((rainfallEffect / 25) * 40) },
    { name: "Soil Saturation", contributionPct: Math.round((soilEffect / 15) * 30) },
    { name: "Slope Gradient", contributionPct: Math.round((slopeEffect / 15) * 20) },
    { name: "Historical Instability", contributionPct: Math.round(rand(5) * 10) },
  ];

  return {
    riskScore: currentScore,
    severity: scoreToSeverity(currentScore),
    confidence,
    factors,
    current: { riskScore: currentScore, severity: scoreToSeverity(currentScore) },
    forecast6h: { riskScore: forecast6Score, severity: scoreToSeverity(forecast6Score) },
    forecast12h: { riskScore: forecast12Score, severity: scoreToSeverity(forecast12Score) },
    modelVersion: "mock-v1",
  };
}

export function mockImageVerification(): { status: "AUTHENTIC" | "SUSPECTED_FAKE"; confidence: number } {
  const confidence = 60 + Math.round(Math.random() * 39);
  return { status: confidence > 70 ? "AUTHENTIC" : "SUSPECTED_FAKE", confidence };
}

export interface DynamicRiskInput {
  locationId: string;
  rainfallMm: number;
  soilMoisturePct: number;
  slopeAngleDeg: number;
  incidentCount: number;
  recentIncidentCount: number;
  incidentSeverityPoints: number;
  blockedRoads: number;
  damagedInfrastructure: number;
  populationImpact: number;
}

/** Deterministic, explainable operational risk calculation. ML can replace this later. */
export function generateDynamicRisk(input: DynamicRiskInput): RiskResult {
  const weather = generateMockRisk(input.locationId, input.rainfallMm, input.soilMoisturePct, input.slopeAngleDeg);
  const incidentDensity = Math.min(18, input.incidentCount * 3);
  const recentIncidents = Math.min(20, input.recentIncidentCount * 7);
  const incidentSeverity = Math.min(18, input.incidentSeverityPoints * 2);
  const roadImpact = Math.min(14, input.blockedRoads * 7);
  const infrastructureImpact = Math.min(12, input.damagedInfrastructure * 4);
  const populationImpact = Math.min(10, Math.log10(Math.max(1, input.populationImpact)) * 2);
  const operationalImpact = incidentDensity + recentIncidents + incidentSeverity + roadImpact + infrastructureImpact + populationImpact;
  const score = clamp(Math.round(weather.riskScore * 0.58 + operationalImpact), 0, 100);
  const factors: RiskFactor[] = [
    ...weather.factors.slice(0, 3),
    { name: "Incident count & density", contributionPct: incidentDensity },
    { name: "Recent serious incidents", contributionPct: recentIncidents + incidentSeverity },
    { name: "Blocked roads", contributionPct: roadImpact },
    { name: "Damaged infrastructure", contributionPct: infrastructureImpact },
    { name: "Population & infrastructure impact", contributionPct: populationImpact },
  ];
  const normalized = factors.reduce((sum, factor) => sum + factor.contributionPct, 0) || 1;
  factors.forEach((factor) => (factor.contributionPct = Math.round((factor.contributionPct / normalized) * 100)));
  return {
    riskScore: score,
    severity: scoreToSeverity(score),
    confidence: Math.min(97, 70 + Math.min(25, input.incidentCount * 2 + input.blockedRoads * 3)),
    factors,
    current: { riskScore: score, severity: scoreToSeverity(score) },
    forecast6h: { riskScore: clamp(score + Math.min(10, input.recentIncidentCount * 2 + input.blockedRoads), 0, 100), severity: scoreToSeverity(clamp(score + Math.min(10, input.recentIncidentCount * 2 + input.blockedRoads), 0, 100)) },
    forecast12h: { riskScore: clamp(score + Math.min(15, input.recentIncidentCount * 3 + input.blockedRoads * 2), 0, 100), severity: scoreToSeverity(clamp(score + Math.min(15, input.recentIncidentCount * 3 + input.blockedRoads * 2), 0, 100)) },
    modelVersion: "rules-v2-dynamic",
  };
}
