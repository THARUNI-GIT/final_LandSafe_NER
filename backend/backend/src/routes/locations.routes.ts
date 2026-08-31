import { Router } from "express";
import { Location } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate, AuthedRequest } from "../middleware/auth";
import { scopeFor } from "../utils/authority";

const router = Router();

router.get("/", authenticate, async (req: AuthedRequest, res) => {
  const { district, state } = req.query;
  const filter: Record<string, unknown> = {};
  Object.assign(filter, scopeFor(req));
  if (district && !filter.district) filter.district = district;
  if (state && !filter.state) filter.state = state;
  const locations = await Location.find(filter).sort({ name: 1 });
  return ok(res, locations);
});

router.get("/search", authenticate, async (req: AuthedRequest, res) => {
  const q = (req.query.q as string) || "";
  if (!q) return ok(res, []);
  const results = await Location.find({ $text: { $search: q }, ...scopeFor(req) }).limit(20);
  return ok(res, results);
});

router.get("/hierarchy", authenticate, async (_req, res) => {
  const states = await Location.aggregate([
    { $group: { _id: { state: "$state", district: "$district" }, count: { $sum: 1 } } },
    { $group: { _id: "$_id.state", districts: { $push: { district: "$_id.district", locationCount: "$count" } } } },
    { $project: { _id: 0, state: "$_id", districts: 1 } },
    { $sort: { state: 1 } },
  ]);
  return ok(res, states);
});

router.get("/:id", authenticate, async (req, res) => {
  const location = await Location.findById(req.params.id);
  if (!location) return fail(res, "Location not found", 404);
  return ok(res, location);
});

export default router;
