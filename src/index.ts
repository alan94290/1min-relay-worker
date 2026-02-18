import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import apiRoutes from "./routes/api";
// Logger middleware removed for production
import rootRoutes from "./routes/root";
import { getModelData } from "./services/model-registry";
import type { HonoEnv } from "./types/hono";

const app = new Hono<HonoEnv>();

// Global error handler must be first
app.use("*", errorHandler);
app.use("*", corsMiddleware);

// Warm up model cache (non-blocking, won't delay the request)
app.use("*", async (c, next) => {
  c.executionCtx.waitUntil(getModelData(c.env).catch(() => {}));
  await next();
});

// Global unhandled error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: {
        message: "Internal Server Error",
        type: "internal_error",
        param: null,
        code: "internal_error",
      },
    },
    500,
  );
});

// Routes
app.route("/", rootRoutes);
app.route("/v1", apiRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

export default app;
