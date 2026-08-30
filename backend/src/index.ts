import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { startHealthCheckLoop } from "./services/monitoring";

import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";
import nodesRoutes from "./routes/nodes";
import peersRoutes from "./routes/peers";
import statsRoutes from "./routes/stats";
import adminRoutes from "./routes/admin";
import subscriptionRoutes from "./routes/subscription";

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
  })
);
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Global rate limit as a baseline defense-in-depth layer (routes add stricter limits too).
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true, service: "PARSAping API" }));

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/nodes", nodesRoutes);
app.use("/api/peers", peersRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/sub", subscriptionRoutes);

// Central error handler — never leak stack traces or secrets to clients.
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(env.BACKEND_PORT, () => {
  console.log(`PARSAping API listening on port ${env.BACKEND_PORT} (${env.NODE_ENV})`);
  startHealthCheckLoop(60_000);
});
