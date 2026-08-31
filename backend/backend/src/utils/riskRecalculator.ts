import { EnvironmentalReading, Incident, Infrastructure, Location, PopulationZone, Prediction, Road } from "../models/models";
import { generateDynamicRisk } from "./riskEngine";

const severityWeight: Record<string, number> = { LOW: 1, MODERATE: 2, HIGH: 4, CRITICAL: 6 };

export async function recalculateLocationRisk(locationId: string) {
  const location = await Location.findById(locationId);
  if (!location) return null;
  const recentAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [reading, incidents, roads, infrastructure, population] = await Promise.all([
    EnvironmentalReading.findOne({ locationId }).sort({ recordedAt: -1 }),
    Incident.find({ locationId, status: { $in: ["PENDING", "VERIFIED"] } }).select("severityGuess createdAt"),
    Road.find({ $or: [{ startLocationId: locationId }, { endLocationId: locationId }], status: { $in: ["BLOCKED", "DAMAGED"] } }),
    Infrastructure.find({ locationId, status: { $in: ["DAMAGED", "DESTROYED"] } }),
    PopulationZone.findOne({ locationId }),
  ]);
  const result = generateDynamicRisk({
    locationId: location._id.toString(),
    rainfallMm: reading?.rainfallMm ?? 0,
    soilMoisturePct: reading?.soilMoisturePct ?? 0,
    slopeAngleDeg: reading?.slopeAngleDeg ?? 0,
    incidentCount: incidents.length,
    recentIncidentCount: incidents.filter((incident) => incident.createdAt >= recentAt).length,
    incidentSeverityPoints: incidents.reduce((total, incident) => total + (severityWeight[incident.severityGuess] ?? 2), 0),
    blockedRoads: roads.length,
    damagedInfrastructure: infrastructure.length,
    populationImpact: (population?.population ?? location.population ?? 0) + (population?.vulnerablePopulation ?? 0),
  });
  return Prediction.create({ locationId: location._id, ...result });
}
