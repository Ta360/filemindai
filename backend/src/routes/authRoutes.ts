import { Router } from "express";
import crypto from "node:crypto";
import { asyncHandler } from "../middleware/errorHandler";
import { attachUser, clearSessionCookie, setSessionCookie, type AuthedRequest } from "../middleware/auth";
import { getAuthUrl, exchangeCodeForTokens, isConnected, disconnect } from "../services/googleDrive/oauthService";
import { usersRepo } from "../database/repositories";
import { env, isGoogleConfigured } from "../config/env";

export const authRoutes = Router();

// Starts the OAuth flow — redirects the browser to Google's consent screen.
authRoutes.get(
  "/google",
  asyncHandler(async (req, res) => {
    if (!isGoogleConfigured) {
      return res.status(503).json({ error: "GOOGLE_NOT_CONFIGURED", message: "Google Drive integration is not configured on the server yet." });
    }
    const state = crypto.randomBytes(16).toString("hex");
    res.cookie("gdl_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.nodeEnv === "production",
      maxAge: 5 * 60 * 1000,
    });
    res.redirect(getAuthUrl(state));
  })
);

// Google redirects here after the user approves/denies access.
authRoutes.get(
  "/callback",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { code, state } = req.query as { code?: string; state?: string };
    const expectedState = req.cookies?.gdl_oauth_state;
    if (!code || !state || state !== expectedState) {
      return res.redirect(`${env.frontendUrl}/?driveError=invalid_state`);
    }
    try {
      const { userId } = await exchangeCodeForTokens(code);
      setSessionCookie(res, userId);
      res.redirect(`${env.frontendUrl}/?driveConnected=1`);
    } catch (err) {
      console.error("[oauth callback]", err);
      res.redirect(`${env.frontendUrl}/?driveError=auth_failed`);
    }
  })
);

authRoutes.get(
  "/status",
  attachUser,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.userId) return res.json({ connected: false });
    const user = usersRepo.get(req.userId);
    res.json({ connected: isConnected(req.userId), email: user?.email });
  })
);

authRoutes.post(
  "/logout",
  attachUser,
  asyncHandler(async (req: AuthedRequest, res) => {
    if (req.userId) disconnect(req.userId);
    clearSessionCookie(res);
    res.json({ ok: true });
  })
);
