import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { webSearchService } from "../services/webSearch/webSearchService";

export const webRoutes = Router();
webRoutes.use(requireAuth);

const searchSchema = z.object({ query: z.string().min(1).max(500) });

webRoutes.post(
  "/search",
  asyncHandler(async (req, res) => {
    const { query } = searchSchema.parse(req.body);
    const results = await webSearchService.search(query);
    res.json({ results, query });
  })
);
