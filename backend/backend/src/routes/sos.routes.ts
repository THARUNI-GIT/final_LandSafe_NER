import { Router } from "express";
import { SOSRequest, Location } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate, authorize, AuthedRequest } from "../middleware/auth";
import { scopeFor, mayAccessLocation } from "../utils/authority";

const router = Router();
router.use(authenticate);

// Nearest Location by simple squared-distance over lat/lng (NER is small enough
// that this is fine without a geo index). Used to resolve district/state for
// admin-authority scoping -- SOS requests only carry a raw GPS point.
async function nearestLocation(lat: number, lng: number) {
  const locations = await Location.find().select("_id name district state lat lng");
  let best: (typeof locations)[number] | null = null;
  let bestDist = Infinity;
  for (const loc of locations) {
    const d = (loc.lat - lat) ** 2 + (loc.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return best;
}

router.post("/", async (req: AuthedRequest, res) => {
  const { gps, description } = req.body;
  if (!gps || !Number.isFinite(gps.lat) || !Number.isFinite(gps.lng)) return fail(res, "Valid gps {lat, lng} is required", 422);
  const nearest = await nearestLocation(gps.lat, gps.lng);
  const sos = await SOSRequest.create({
    userId: req.user!.id,
    gps,
    description,
    nearestLocationId: nearest?._id ?? null,
    district: nearest?.district ?? null,
    state: nearest?.state ?? null,
  });
  return ok(res, sos, "SOS request submitted", 201);
});

router.get("/", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req: AuthedRequest, res) => {
  const { status } = req.query;
  const filter: Record<string, unknown> = { ...scopeFor(req) };
  if (status) filter.status = status;
  const requests = await SOSRequest.find(filter)
    .sort({ createdAt: -1 })
    .populate("userId", "name phone")
    .populate("assignedTaskForceId", "name type status");
  return ok(res, requests);
});

router.patch("/:id", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req: AuthedRequest, res) => {
  const { status, assignedTaskForceId } = req.body;
  const existing = await SOSRequest.findById(req.params.id);
  if (!existing) return fail(res, "SOS request not found", 404);
  if (!(await mayAccessLocation(req, res, existing.nearestLocationId))) return;
  const sos = await SOSRequest.findByIdAndUpdate(
    req.params.id,
    { $set: { status, assignedTaskForceId } },
    { new: true }
  );
  return ok(res, sos, "SOS request updated");
});

export default router;
