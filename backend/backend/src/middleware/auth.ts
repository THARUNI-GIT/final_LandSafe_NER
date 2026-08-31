import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { fail } from "../utils/response";
import { User } from "../models/models";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string; district?: string; state?: string };
}

export async function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return fail(res, "Missing or invalid Authorization header", 401);
  }
  const token = header.split(" ")[1];
  try {
    const payload = verifyToken(token);
    // Scope is read from MongoDB rather than trusted from a stale JWT claim.
    const user = await User.findById(payload.id).select("role district state");
    if (!user) return fail(res, "User not found", 401);
    req.user = { id: user._id.toString(), role: user.role, district: user.district ?? undefined, state: user.state ?? undefined };
    next();
  } catch {
    return fail(res, "Invalid or expired token", 401);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return fail(res, "Not authenticated", 401);
    if (!roles.includes(req.user.role)) return fail(res, "Forbidden: insufficient role", 403);
    next();
  };
}
