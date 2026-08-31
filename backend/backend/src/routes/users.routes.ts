import { Router } from "express";
import { User } from "../models/models";
import { ok, fail } from "../utils/response";
import { authenticate, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/me", async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user!.id).select("-password");
  if (!user) return fail(res, "User not found", 404);
  return ok(res, user);
});

router.put("/me", async (req: AuthedRequest, res) => {
  const { name, phone, district, state, location, preferences } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user!.id,
    { $set: { name, phone, district, state, location, preferences } },
    { new: true, runValidators: true }
  ).select("-password");
  if (!user) return fail(res, "User not found", 404);
  return ok(res, user, "Profile updated");
});

export default router;
