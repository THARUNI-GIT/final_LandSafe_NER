import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/models";
import { signToken } from "../utils/jwt";
import { ok, fail } from "../utils/response";
import { authenticate, AuthedRequest } from "../middleware/auth";
import { randomUUID } from "crypto";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, district, state, location } = req.body;
    if (!name || !email || !password) return fail(res, "name, email, password are required", 422);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return fail(res, "Email already registered", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: role || "CITIZEN",
      phone,
      district,
      state,
      location,
    });

    const token = signToken({ id: user._id.toString(), role: user.role });
    const { password: _pw, ...safeUser } = user.toObject();
    return ok(res, { token, user: safeUser }, "Registered successfully", 201);
  } catch (err) {
    return fail(res, "Registration failed", 500, String(err));
  }
});

router.get("/google", (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) return fail(res, "Google login is not configured", 503);
  const params = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", prompt: "select_account" });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  if (!code || !clientId || !clientSecret || !redirectUri) return fail(res, "Google login is not configured", 503);
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) return fail(res, "Google authorization failed", 401);
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const profile = await profileResponse.json() as { email?: string; name?: string };
    if (!profile.email) return fail(res, "Google account did not provide an email address", 422);
    let user = await User.findOne({ email: profile.email.toLowerCase() });
    if (!user) user = await User.create({ name: profile.name || profile.email.split("@")[0], email: profile.email.toLowerCase(), password: await bcrypt.hash(randomUUID(), 10), role: "CITIZEN" });
    const token = signToken({ id: user._id.toString(), role: user.role });
    return res.redirect(`${frontendUrl}/login?googleToken=${encodeURIComponent(token)}`);
  } catch (err) { return fail(res, "Google login failed", 500, String(err)); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, "email and password are required", 422);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return fail(res, "Invalid credentials", 401);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, "Invalid credentials", 401);

    const token = signToken({ id: user._id.toString(), role: user.role });
    const { password: _pw, ...safeUser } = user.toObject();
    return ok(res, { token, user: safeUser }, "Login successful");
  } catch (err) {
    return fail(res, "Login failed", 500, String(err));
  }
});

router.get("/me", authenticate, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.user!.id).select("-password");
  if (!user) return fail(res, "User not found", 404);
  return ok(res, user);
});

export default router;
