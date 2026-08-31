import { Router } from "express";
import { Road } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate, authorize } from "../middleware/auth";
import { scopeFor, mayAccessLocation } from "../utils/authority";
import { recalculateLocationRisk } from "../utils/riskRecalculator";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { district, state, status } = req.query;
  const filter: Record<string, unknown> = {};
  Object.assign(filter, scopeFor(req as any));
  if (district && !filter.district) filter.district = district;
  if (state && !filter.state) filter.state = state;
  if (status) filter.status = status;
  const roads = await Road.find(filter).populate("startLocationId endLocationId", "name district state lat lng");
  return ok(res, roads);
});

router.patch("/:id", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req, res) => {
  const { status } = req.body;
  const current = await Road.findById(req.params.id);
  if (!current) return fail(res, "Road not found", 404);
  if (!(await mayAccessLocation(req as any, res, current.startLocationId))) return;
  const road = await Road.findByIdAndUpdate(req.params.id, { status }, { new: true });
  await Promise.all([recalculateLocationRisk(current.startLocationId.toString()), recalculateLocationRisk(current.endLocationId.toString())]);
  return ok(res, road, "Road status updated");
});

export default router;
