import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import * as driveService from "../services/googleDrive/driveService";
import { recordFileOpen } from "../services/ai/aiService";

export const driveRoutes = Router();
driveRoutes.use(requireAuth);

driveRoutes.get(
  "/files",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { query, mimeTypeGroup, parentFolderId, modifiedAfter, pageToken, pageSize } = req.query as Record<string, string>;
    const result = await driveService.searchFiles(req.userId!, {
      query,
      mimeTypeGroup: mimeTypeGroup as any,
      parentFolderId,
      modifiedAfter,
      pageToken,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  })
);

driveRoutes.get(
  "/folders",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { query, pageToken, pageSize } = req.query as Record<string, string>;
    const result = await driveService.searchFolders(req.userId!, {
      query,
      pageToken,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json(result);
  })
);

driveRoutes.get(
  "/search",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { query, pageToken, pageSize } = req.query as Record<string, string>;
    const [files, folders] = await Promise.all([
      driveService.searchFiles(req.userId!, { query, pageToken, pageSize: pageSize ? Number(pageSize) : undefined }),
      driveService.searchFolders(req.userId!, { query, pageSize: 10 }),
    ]);
    res.json({ files: files.files, folders: folders.folders, nextPageToken: files.nextPageToken, query });
  })
);

driveRoutes.get(
  "/file/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const file = await driveService.getFileMetadata(req.userId!, req.params.id);
    res.json(file);
  })
);

driveRoutes.post(
  "/file/:id/open",
  asyncHandler(async (req: AuthedRequest, res) => {
    const file = await recordFileOpen(req.userId!, req.params.id);
    res.json(file);
  })
);

// Streams file bytes through the backend using the user's own OAuth token —
// keeps private files private while still allowing in-app preview.
driveRoutes.get(
  "/file/:id/preview",
  asyncHandler(async (req: AuthedRequest, res) => {
    const meta = await driveService.getFileMetadata(req.userId!, req.params.id);
    const { stream, status, headers } = await driveService.streamFile(req.userId!, req.params.id, req.headers.range);
    res.status(req.headers.range ? 206 : 200);
    res.setHeader("Content-Type", meta.mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=60");
    if (headers["content-range"]) res.setHeader("Content-Range", headers["content-range"]);
    if (headers["content-length"]) res.setHeader("Content-Length", headers["content-length"]);
    stream.on("error", () => res.status(502).end());
    stream.pipe(res);
  })
);

driveRoutes.get(
  "/file/:id/download",
  asyncHandler(async (req: AuthedRequest, res) => {
    const meta = await driveService.getFileMetadata(req.userId!, req.params.id);
    res.setHeader("Content-Type", meta.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${meta.name.replace(/"/g, "")}"`);
    const { stream } = await driveService.streamFile(req.userId!, req.params.id);
    stream.on("error", () => res.status(502).end());
    stream.pipe(res);
  })
);
