import { Router } from "express";
import {
  Prediction,
  Incident,
  Road,
  Infrastructure,
  TaskForce,
  PopulationZone,
  Recommendation,
  Location,
} from "../models/models";
import { ok } from "../utils/response";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// districts ranked by number/severity of high-risk predictions
router.get("/critical-districts", async (_req, res) => {
  const result = await Prediction.aggregate([
    { $match: { severity: { $in: ["HIGH", "CRITICAL"] } } },
    { $lookup: { from: "locations", localField: "locationId", foreignField: "_id", as: "location" } },
    { $unwind: "$location" },
    {
      $group: {
        _id: { district: "$location.district", state: "$location.state" },
        criticalCount: { $sum: { $cond: [{ $eq: ["$severity", "CRITICAL"] }, 1, 0] } },
        highCount: { $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] } },
        avgRiskScore: { $avg: "$riskScore" },
      },
    },
    { $project: { _id: 0, district: "$_id.district", state: "$_id.state", criticalCount: 1, highCount: 1, avgRiskScore: { $round: ["$avgRiskScore", 1] } } },
    { $sort: { criticalCount: -1, avgRiskScore: -1 } },
    { $limit: 10 },
  ]);
  return ok(res, result);
});

// highest risk individual locations
router.get("/highest-risk", async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const predictions = await Prediction.find()
    .sort({ riskScore: -1 })
    .limit(limit)
    .populate("locationId", "name district state lat lng");
  return ok(res, predictions);
});

router.get("/population-at-risk", async (_req, res) => {
  const zones = await PopulationZone.find({ riskLevel: { $in: ["HIGH", "CRITICAL"] } })
    .sort({ population: -1 })
    .populate("locationId", "name district state");
  return ok(res, zones);
});

router.get("/blocked-roads", async (_req, res) => {
  const roads = await Road.find({ status: { $in: ["BLOCKED", "DAMAGED"] } }).populate(
    "startLocationId endLocationId",
    "name district state"
  );
  return ok(res, roads);
});

router.get("/affected-infrastructure", async (_req, res) => {
  const infra = await Infrastructure.find({ status: { $in: ["DAMAGED", "DESTROYED"] } }).populate(
    "locationId",
    "name district state"
  );
  return ok(res, infra);
});

router.get("/active-incidents", async (_req, res) => {
  const incidents = await Incident.find({ status: { $in: ["PENDING", "VERIFIED"] } })
    .sort({ createdAt: -1 })
    .populate("locationId", "name district state");
  return ok(res, incidents);
});

router.get("/available-taskforces", async (_req, res) => {
  const taskForces = await TaskForce.find({ status: "AVAILABLE" });
  return ok(res, taskForces);
});

router.get("/recommendations", async (req, res) => {
  const { district, state } = req.query;
  const filter: Record<string, unknown> = {};
  if (district) filter.district = district;
  if (state) filter.state = state;
  const recommendations = await Recommendation.find(filter).sort({ priority: -1, createdAt: -1 });
  return ok(res, recommendations);
});

// single combined snapshot for the admin AI assistant panel
router.get("/summary", async (_req, res) => {
  const [criticalDistrictsCount, activeIncidents, availableTaskForces, blockedRoads, highRisk] = await Promise.all([
    Prediction.countDocuments({ severity: "CRITICAL" }),
    Incident.countDocuments({ status: { $in: ["PENDING", "VERIFIED"] } }),
    TaskForce.countDocuments({ status: "AVAILABLE" }),
    Road.countDocuments({ status: { $in: ["BLOCKED", "DAMAGED"] } }),
    Prediction.find().sort({ riskScore: -1 }).limit(5).populate("locationId", "name district state"),
  ]);
  return ok(res, { criticalDistrictsCount, activeIncidents, availableTaskForces, blockedRoads, topRiskLocations: highRisk });
});

export default router;
