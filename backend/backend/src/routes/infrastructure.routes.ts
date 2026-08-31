import { Router } from "express";
import { Infrastructure } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate, authorize } from "../middleware/auth";
import { locationIdsFor, mayAccessLocation } from "../utils/authority";
import { recalculateLocationRisk } from "../utils/riskRecalculator";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { type, status, locationId } = req.query;
  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (locationId) filter.locationId = locationId;
  const scopedIds = await locationIdsFor(req as any);
  if (scopedIds) filter.locationId = locationId ? { $eq: locationId, $in: scopedIds } : { $in: scopedIds };
  const infrastructure = await Infrastructure.find(filter).populate("locationId", "name district state lat lng");
  return ok(res, infrastructure);
});

router.patch("/:id", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req, res) => {
  const { status } = req.body;
  const current = await Infrastructure.findById(req.params.id);
  if (!current) return fail(res, "Infrastructure not found", 404);
  if (!(await mayAccessLocation(req as any, res, current.locationId))) return;
  const infra = await Infrastructure.findByIdAndUpdate(req.params.id, { status }, { new: true });
  await recalculateLocationRisk(current.locationId.toString());
  return ok(res, infra, "Infrastructure status updated");
});

export default router;
