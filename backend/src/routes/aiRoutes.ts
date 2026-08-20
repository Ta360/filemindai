import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { runAssistant } from "../services/ai/aiService";
import { chatRepo } from "../database/repositories";

export const aiRoutes = Router();
aiRoutes.use(requireAuth);

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().min(1),
});

aiRoutes.post(
  "/chat",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { message, conversationId } = chatSchema.parse(req.body);
    const response = await runAssistant(req.userId!, conversationId, message);
    res.json(response);
  })
);

aiRoutes.get(
  "/chat/:conversationId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const messages = await chatRepo.list(req.userId!, req.params.conversationId);
    res.json({ messages });
  })
);

aiRoutes.delete(
  "/chat/:conversationId",
  asyncHandler(async (req: AuthedRequest, res) => {
    await chatRepo.clear(req.userId!, req.params.conversationId);
    res.json({ ok: true });
  })
);
