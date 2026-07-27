import { Router } from "express";
import { menuRoutes } from "./controllers/menuController";
import { orderRoutes } from "./controllers/orderController";
import { authRoutes } from "./controllers/authController";
import { customerRoutes } from "./controllers/customerController";
import { analyticsRoutes } from "./controllers/analyticsController";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/menu", menuRoutes);
apiRouter.use("/orders", orderRoutes);
apiRouter.use("/customers", customerRoutes);
apiRouter.use("/analytics", analyticsRoutes);