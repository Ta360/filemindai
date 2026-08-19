import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { activityRepo } from "../database/repositories";

export const calendarRoutes = Router();
calendarRoutes.use(requireAuth);

calendarRoutes.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { start, end } = req.query as Record<string, string>;
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    res.json({ entries: activityRepo.listRange(req.userId!, start || defaultStart, end || defaultEnd) });
  })
);
