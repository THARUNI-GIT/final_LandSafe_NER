import { Response } from "express";

export function ok(res: Response, data: unknown, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function fail(res: Response, message = "Error", status = 400, data: unknown = null) {
  return res.status(status).json({ success: false, message, data });
}
