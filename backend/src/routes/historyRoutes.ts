import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { historyRepo } from "../database/repositories";

export const historyRoutes = Router();
historyRoutes.use(requireAuth);

historyRoutes.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    res.json({ entries: await historyRepo.list(req.userId!, limit) });
  })
);

historyRoutes.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    await historyRepo.remove(req.userId!, req.params.id);
    res.json({ ok: true });
  })
);

historyRoutes.delete(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    await historyRepo.clear(req.userId!);
    res.json({ ok: true });
  })
);
