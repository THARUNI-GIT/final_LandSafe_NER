import { Router } from "express";
import { Incident, Alert, TaskForce, Prediction, Location, PopulationZone } from "../models/models";
import { ok } from "../utils/response";
import { authenticate, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

async function buildStats(filter: { district?: string; state?: string }) {
  const locationFilter: Record<string, unknown> = {};
  if (filter.district) locationFilter.district = filter.district;
  if (filter.state) locationFilter.state = filter.state;

  const locations = await Location.find(locationFilter).select("_id");
  const locationIds = locations.map((l) => l._id);

  const [incidentCount, activeAlerts, availableTaskForces, deployedTaskForces, highRiskPredictions, populationAtRisk] =
    await Promise.all([
      Incident.countDocuments({ locationId: { $in: locationIds } }),
      Alert.countDocuments({ active: true, ...(filter.district ? { district: filter.district } : {}), ...(filter.state ? { state: filter.state } : {}) }),
      TaskForce.countDocuments({ status: "AVAILABLE", ...(filter.district ? { district: filter.district } : {}), ...(filter.state ? { state: filter.state } : {}) }),
      TaskForce.countDocuments({ status: "DEPLOYED", ...(filter.district ? { district: filter.district } : {}), ...(filter.state ? { state: filter.state } : {}) }),
      Prediction.countDocuments({ locationId: { $in: locationIds }, severity: { $in: ["HIGH", "CRITICAL"] } }),
      PopulationZone.aggregate([
        { $match: { locationId: { $in: locationIds } } },
        { $group: { _id: null, total: { $sum: "$population" }, vulnerable: { $sum: "$vulnerablePopulation" } } },
      ]),
    ]);

  return {
    incidentCount,
    activeAlerts,
    availableTaskForces,
    deployedTaskForces,
    highRiskLocations: highRiskPredictions,
    populationTotal: populationAtRisk[0]?.total || 0,
    populationVulnerable: populationAtRisk[0]?.vulnerable || 0,
  };
}

router.get("/district/:district", async (req: AuthedRequest, res) => {
  if (req.user?.role === "DISTRICT_ADMIN" && req.user.district !== req.params.district) return res.status(403).json({ success: false, message: "Forbidden outside your assigned district" });
  if (req.user?.role === "STATE_ADMIN" && req.user.state && !(await Location.exists({ district: req.params.district, state: req.user.state }))) return res.status(403).json({ success: false, message: "Forbidden outside your assigned state" });
  const stats = await buildStats({ district: req.params.district });
  return ok(res, stats);
});

router.get("/state/:state", async (req: AuthedRequest, res) => {
  if (req.user?.role === "DISTRICT_ADMIN" || (req.user?.role === "STATE_ADMIN" && req.user.state !== req.params.state)) return res.status(403).json({ success: false, message: "Forbidden outside your assigned authority" });
  const stats = await buildStats({ state: req.params.state });
  return ok(res, stats);
});

router.get("/central", async (req: AuthedRequest, res) => {
  if (req.user?.role === "DISTRICT_ADMIN") return res.status(403).json({ success: false, message: "Use your district dashboard" });
  if (req.user?.role === "STATE_ADMIN") return res.status(403).json({ success: false, message: "Use your state dashboard" });
  const stats = await buildStats({});
  return ok(res, stats);
});

export default router;
