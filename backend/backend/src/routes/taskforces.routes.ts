import { Router } from "express";
import { TaskForce, Incident } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/", async (req, res) => {
  const { district, state, status } = req.query;
  const filter: Record<string, unknown> = {};
  if (district) filter.district = district;
  if (state) filter.state = state;
  if (status) filter.status = status;
  const taskForces = await TaskForce.find(filter).sort({ name: 1 });
  return ok(res, taskForces);
});

// recommend + assign nearest available task force to an incident's location
router.post("/:id/assign", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req, res) => {
  const { incidentId } = req.body;
  const incident = await Incident.findById(incidentId);
  if (!incident) return fail(res, "Incident not found", 404);

  const taskForce = await TaskForce.findById(req.params.id);
  if (!taskForce) return fail(res, "Task force not found", 404);
  if (taskForce.status !== "AVAILABLE") return fail(res, "Task force is not available", 409);

  taskForce.status = "DEPLOYED";
  taskForce.assignedIncidentId = incident._id;
  await taskForce.save();

  return ok(res, taskForce, "Task force assigned");
});

// list available task forces near an incident, ranked by distance + estimated ETA (40km/h avg)
router.get("/recommend/:incidentId", async (req, res) => {
  const incident = await Incident.findById(req.params.incidentId);
  if (!incident) return fail(res, "Incident not found", 404);

  const available = await TaskForce.find({ status: "AVAILABLE" });
  const ranked = available
    .map((tf) => {
      const distanceKm = haversineKm(
        tf.currentLocation!.lat,
        tf.currentLocation!.lng,
        incident.gps!.lat,
        incident.gps!.lng
      );
      const etaMinutes = Math.round((distanceKm / 40) * 60);
      return { taskForce: tf, distanceKm: Math.round(distanceKm * 10) / 10, etaMinutes };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);

  return ok(res, ranked);
});

router.patch("/:id", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req, res) => {
  const { status, currentLocation, resources } = req.body;
  const taskForce = await TaskForce.findByIdAndUpdate(
    req.params.id,
    { $set: { status, currentLocation, resources } },
    { new: true, runValidators: true }
  );
  if (!taskForce) return fail(res, "Task force not found", 404);
  return ok(res, taskForce, "Task force updated");
});

export default router;
