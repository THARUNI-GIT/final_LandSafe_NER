import { Router } from "express";
import { Alert } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate, authorize, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  const { district, state, active } = req.query;
  const filter: Record<string, unknown> = {};
  if (district) filter.district = district;
  if (state) filter.state = state;
  if (active !== undefined) filter.active = active === "true";

  const alerts = await Alert.find(filter).sort({ createdAt: -1 }).populate("locationIds", "name district state");
  return ok(res, alerts);
});

router.get("/:id", async (req, res) => {
  const alert = await Alert.findById(req.params.id).populate("locationIds", "name district state");
  if (!alert) return fail(res, "Alert not found", 404);
  return ok(res, alert);
});

router.post("/", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req: AuthedRequest, res) => {
  const { title, message, severity, locationIds, district, state, expiresAt } = req.body;
  if (!title || !message || !severity) return fail(res, "title, message, severity are required", 422);

  const alert = await Alert.create({
    title,
    message,
    severity,
    locationIds,
    district,
    state,
    issuedBy: req.user!.id,
    expiresAt,
  });
  return ok(res, alert, "Alert issued", 201);
});

router.patch("/:id/deactivate", authorize("DISTRICT_ADMIN", "STATE_ADMIN", "CENTRAL_ADMIN"), async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!alert) return fail(res, "Alert not found", 404);
  return ok(res, alert, "Alert deactivated");
});

export default router;
