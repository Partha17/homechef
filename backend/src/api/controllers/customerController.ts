import { Router, Request, Response } from "express";
import { authenticate, requireKitchenOwner } from "../middleware/auth";

export const customerRoutes = Router();

customerRoutes.get("/:kitchenId", authenticate, requireKitchenOwner, (_req: Request, res: Response) => {
  // TODO: List customers for a kitchen
  res.json({ message: "Customer list - not yet implemented" });
});

customerRoutes.get("/:kitchenId/:customerId", authenticate, requireKitchenOwner, (_req: Request, res: Response) => {
  // TODO: Get customer details with order history
  res.json({ message: "Customer detail - not yet implemented" });
});

customerRoutes.patch("/:kitchenId/:customerId/notes", authenticate, requireKitchenOwner, (_req: Request, res: Response) => {
  // TODO: Update personal notes for a customer
  res.json({ message: "Customer notes update - not yet implemented" });
});