import { Router } from "express";
import { Incident } from "../models/models";
import { mockImageVerification } from "../utils/riskEngine";
import { ok, fail } from "../utils/response";
import { authenticate, authorize, AuthedRequest } from "../middleware/auth";
import { locationIdsFor, mayAccessLocation } from "../utils/authority";
import { recalculateLocationRisk } from "../utils/riskRecalculator";

const router = Router();
router.use(authenticate);

// simple proximity+time based clustering: same location within 500m and 6 hours -> same clusterId
async function computeClusterId(locationId: string, lat: number, lng: number): Promise<string> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const nearby = await Incident.findOne({
    locationId,
    createdAt: { $gte: sixHoursAgo },
    "gps.lat": { $gte: lat - 0.005, $lte: lat + 0.005 },
    "gps.lng": { $gte: lng - 0.005, $lte: lng + 0.005 },
  }).sort({ createdAt: -1 });

  if (nearby?.clusterId) return nearby.clusterId;
  return `CLUSTER-${locationId}-${Date.now()}`;
}

router.post("/", async (req: AuthedRequest, res) => {
  try {
    const { locationId, description, gps, images } = req.body;
    if (!locationId || !description || !gps) return fail(res, "locationId, description, gps are required", 422);
    if (!Number.isFinite(gps.lat) || !Number.isFinite(gps.lng)) return fail(res, "Valid GPS latitude and longitude are required", 422);

    const verifiedImages = (images || []).map((img: { url: string }) => {
      const verification = mockImageVerification();
      return { url: img.url, verificationStatus: verification.status, verificationConfidence: verification.confidence };
    });

    const clusterId = await computeClusterId(locationId, gps.lat, gps.lng);

    const incident = await Incident.create({
      reportedBy: req.user!.id,
      locationId,
      description,
      gps,
      images: verifiedImages,
      clusterId,
      status: "PENDING",
    });
    await recalculateLocationRisk(locationId);

    return ok(res, incident, "Incident reported", 201);
  } catch (err) {
    return fail(res, "Failed to report incident", 500, String(err));
  }
});

router.get("/", async (req, res) => {
  const { district, state, status, locationId } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const scopedIds = await locationIdsFor(req as AuthedRequest);
  if (locationId) filter.locationId = locationId;
  if (scopedIds) filter.locationId = locationId ? { $eq: locationId, $in: scopedIds } : { $in: scopedIds };

  let incidents = await Incident.find(filter)
    .sort({ createdAt: -1 })
    .populate("locationId", "name district state")
    .populate("reportedBy", "name email");

  if (district) incidents = incidents.filter((i: any) => i.locationId?.district === district);
  if (state) incidents = incidents.filter((i: any) => i.locationId?.state === state);

  return ok(res, incidents);
});

router.get("/:id([0-9a-fA-F]{24})", async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate("locationId", "name district state")
    .populate("reportedBy", "name email");
  if (!incident) return fail(res, "Incident not found", 404);
  if (!(await mayAccessLocation(req as AuthedRequest, res, incident.locationId))) return;
  return ok(res, incident);
});

router.get("/clusters/geographic", async (req: AuthedRequest, res) => {
  const scopedIds = await locationIdsFor(req);
  const incidents = await Incident.find({ ...(scopedIds ? { locationId: { $in: scopedIds } } : {}), status: { $ne: "REJECTED" } })
    .populate("locationId", "name district state")
    .sort({ createdAt: -1 });
  const clusters: any[] = [];
  for (const incident of incidents) {
    if (!incident.gps) continue;
    const gps = incident.gps;
    const cluster = clusters.find((candidate) => {
      const latDelta = Math.abs(candidate.center.lat - gps.lat);
      const lngDelta = Math.abs(candidate.center.lng - gps.lng);
      return latDelta < 0.01 && lngDelta < 0.01;
    });
    const severityRank: Record<string, number> = { LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };
    if (cluster) {
      cluster.incidents.push(incident);
      cluster.count++;
      cluster.center.lat = (cluster.center.lat * (cluster.count - 1) + incident.gps.lat) / cluster.count;
      cluster.center.lng = (cluster.center.lng * (cluster.count - 1) + incident.gps.lng) / cluster.count;
      if (severityRank[incident.severityGuess] > severityRank[cluster.severity]) cluster.severity = incident.severityGuess;
    } else clusters.push({ id: incident.clusterId || `geo-${incident._id}`, center: { ...gps }, count: 1, severity: incident.severityGuess, incidents: [incident] });
  }
  return ok(res, clusters);
});

router.patch("/:id/status", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req, res) => {
  const { status } = req.body;
  const existing = await Incident.findById(req.params.id);
  if (!existing) return fail(res, "Incident not found", 404);
  if (!(await mayAccessLocation(req, res, existing.locationId))) return;
  const incident = await Incident.findByIdAndUpdate(req.params.id, { status }, { new: true });
  await recalculateLocationRisk(existing.locationId.toString());
  return ok(res, incident, "Incident status updated");
});

export default router;
