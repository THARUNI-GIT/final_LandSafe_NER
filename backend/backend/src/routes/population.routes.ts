import { Router } from "express";
import { PopulationZone } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { riskLevel } = req.query;
  const filter: Record<string, unknown> = {};
  if (riskLevel) filter.riskLevel = riskLevel;
  const zones = await PopulationZone.find(filter).populate("locationId", "name district state lat lng");
  return ok(res, zones);
});

router.get("/:locationId", async (req, res) => {
  const zone = await PopulationZone.findOne({ locationId: req.params.locationId }).populate(
    "locationId",
    "name district state lat lng"
  );
  if (!zone) return fail(res, "Population zone not found", 404);
  return ok(res, zone);
});

export default router;
