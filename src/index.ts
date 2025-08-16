import { Hono } from "hono";
import { HonoEnv } from "./types/hono";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
// Logger middleware removed for production
import rootRoutes from "./routes/root";
import apiRoutes from "./routes/api";

const app = new Hono<HonoEnv>();

// Global error handler must be first
app.use("*", errorHandler);
app.use("*", corsMiddleware);

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
    500
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
