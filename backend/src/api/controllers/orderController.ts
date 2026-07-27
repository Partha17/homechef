import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const orderRoutes = Router();

// List orders for a kitchen (no auth for MVP)
orderRoutes.get("/:kitchenId", async (req: Request, res: Response) => {
  try {
    const { kitchenId } = req.params;
    const orders = await prisma.order.findMany({
      where: { kitchenId },
      include: {
        orderItems: true,
        customer: { select: { name: true, telegramUserId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    console.error("[Orders] List error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get single order details
orderRoutes.get("/:kitchenId/:orderId", async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        customer: { select: { name: true, telegramUserId: true, phone: true } },
      },
    });
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ order });
  } catch (err) {
    console.error("[Orders] Get error:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Update order status
orderRoutes.patch("/:kitchenId/:orderId/status", async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
    res.json({ order });
  } catch (err) {
    console.error("[Orders] Status update error:", err);
    res.status(400).json({ error: "Failed to update status" });
  }
});