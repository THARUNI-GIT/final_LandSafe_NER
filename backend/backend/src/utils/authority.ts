import { Types } from "mongoose";
import { Location } from "../models/models";
import { AuthedRequest } from "../middleware/auth";
import { fail } from "./response";
import type { Response } from "express";

export function scopeFor(req: AuthedRequest): { district?: string; state?: string } {
  if (req.user?.role === "DISTRICT_ADMIN") return req.user.district ? { district: req.user.district } : { district: "__none__" };
  if (req.user?.role === "STATE_ADMIN") return req.user.state ? { state: req.user.state } : { state: "__none__" };
  return {};
}

export async function locationIdsFor(req: AuthedRequest): Promise<Types.ObjectId[] | null> {
  const scope = scopeFor(req);
  if (!Object.keys(scope).length) return null;
  return (await Location.find(scope).select("_id")).map((location) => location._id);
}

export async function mayAccessLocation(req: AuthedRequest, res: Response, locationId: unknown): Promise<boolean> {
  if (req.user?.role === "CENTRAL_ADMIN" || req.user?.role === "CITIZEN") return true;
  const location = await Location.findById(locationId).select("district state");
  const scope = scopeFor(req);
  const allowed = Boolean(location && (!scope.district || location.district === scope.district) && (!scope.state || location.state === scope.state));
  if (!allowed) fail(res, "Forbidden outside your assigned authority", 403);
  return allowed;
}
