import { Router, Request, Response } from "express";
import { authenticate, requireKitchenOwner } from "../middleware/auth";

export const orderRoutes = Router();

orderRoutes.get("/:kitchenId", authenticate, requireKitchenOwner, (_req: Request, res: Response) => {
  // TODO: List orders for a kitchen
  res.json({ message: "Order list - not yet implemented" });
});

orderRoutes.get("/:kitchenId/:orderId", authenticate, requireKitchenOwner, (_req: Request, res: Response) => {
  // TODO: Get order details
  res.json({ message: "Order detail - not yet implemented" });
});

orderRoutes.patch("/:kitchenId/:orderId/status", authenticate, requireKitchenOwner, (_req: Request, res: Response) => {
  // TODO: Update order status
  res.json({ message: "Order status update - not yet implemented" });
});

orderRoutes.patch("/:kitchenId/:orderId/payment", authenticate, requireKitchenOwner, (_req: Request, res: Response) => {
  // TODO: Verify/update payment status
  res.json({ message: "Payment verification - not yet implemented" });
});