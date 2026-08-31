import { Router } from "express";
import { Prediction, Location, EnvironmentalReading } from "../models/models";
import { generateMockRisk } from "../utils/riskEngine";
import { ok, fail } from "../utils/response";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// latest predictions across all locations, sorted by risk desc
router.get("/", async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const predictions = await Prediction.find()
    .sort({ riskScore: -1, generatedAt: -1 })
    .limit(limit)
    .populate("locationId", "name district state lat lng");
  return ok(res, predictions);
});

// latest prediction for one location
router.get("/:locationId", async (req, res) => {
  const prediction = await Prediction.findOne({ locationId: req.params.locationId }).sort({ generatedAt: -1 });
  if (!prediction) return fail(res, "No prediction found for this location", 404);
  return ok(res, prediction);
});

// force-generate a new mock prediction for a location (simulates model re-run)
router.post("/generate/:locationId", async (req, res) => {
  const location = await Location.findById(req.params.locationId);
  if (!location) return fail(res, "Location not found", 404);

  const latestReading = await EnvironmentalReading.findOne({ locationId: location._id }).sort({ recordedAt: -1 });
  const result = generateMockRisk(
    location._id.toString(),
    latestReading?.rainfallMm ?? 0,
    latestReading?.soilMoisturePct ?? 0,
    latestReading?.slopeAngleDeg ?? 0
  );

  const prediction = await Prediction.create({
    locationId: location._id,
    ...result,
  });

  return ok(res, prediction, "Prediction generated", 201);
});

export default router;
