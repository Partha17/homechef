import { Router, Request, Response } from "express";
import { authenticate, requireKitchenOwner } from "../middleware/auth";
import * as menuService from "../../services/menuService";

export const menuRoutes = Router();

// List menu items for a kitchen
menuRoutes.get("/:kitchenId", async (req: Request, res: Response) => {
  try {
    const { kitchenId } = req.params;
    const includeUnavailable = req.query.all === "true";
    const items = await menuService.getMenuByKitchen(kitchenId, includeUnavailable);
    res.json({ items });
  } catch (err) {
    console.error("[Menu] List error:", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

// Create a menu item
menuRoutes.post("/:kitchenId", authenticate, requireKitchenOwner, async (req: Request, res: Response) => {
  try {
    const { kitchenId } = req.params;
    const item = await menuService.createMenuItem({ kitchenId, ...req.body });
    res.status(201).json({ item });
  } catch (err) {
    console.error("[Menu] Create error:", err);
    res.status(400).json({ error: "Failed to create menu item" });
  }
});

// Update a menu item
menuRoutes.put("/:kitchenId/:itemId", authenticate, requireKitchenOwner, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const item = await menuService.updateMenuItem(itemId, req.body);
    res.json({ item });
  } catch (err) {
    console.error("[Menu] Update error:", err);
    res.status(400).json({ error: "Failed to update menu item" });
  }
});

// Soft-delete (mark unavailable) a menu item
menuRoutes.delete("/:kitchenId/:itemId", authenticate, requireKitchenOwner, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    await menuService.deleteMenuItem(itemId);
    res.json({ success: true });
  } catch (err) {
    console.error("[Menu] Delete error:", err);
    res.status(400).json({ error: "Failed to delete menu item" });
  }
});
