import { Router, Request, Response } from "express";

export const authRoutes = Router();

authRoutes.post("/login", (_req: Request, res: Response) => {
  // TODO: Implement Telegram OTP or JWT-based login
  res.json({ message: "Auth endpoint - not yet implemented" });
});

authRoutes.post("/verify", (_req: Request, res: Response) => {
  // TODO: Verify OTP / token
  res.json({ message: "Verify endpoint - not yet implemented" });
});