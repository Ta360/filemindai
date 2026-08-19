import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import * as driveService from "../services/googleDrive/driveService";
import { buildAnalytics } from "../services/analytics/analyticsService";

export const analyticsRoutes = Router();
analyticsRoutes.use(requireAuth);

analyticsRoutes.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { query, mimeTypeGroup, parentFolderId } = req.query as Record<string, string>;
    const [{ files }, { folders }] = await Promise.all([
      driveService.searchFiles(req.userId!, { query, mimeTypeGroup: mimeTypeGroup as any, parentFolderId, pageSize: 200 }),
      driveService.searchFolders(req.userId!, { pageSize: 100 }),
    ]);
    res.json(buildAnalytics(files, folders.length));
  })
);
