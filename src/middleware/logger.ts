import { createMiddleware } from "hono/factory";
import { HonoEnv } from "../types/hono";

export const loggerMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  // Request logging removed for production

  // Call next middleware/handler
  await next();

  // Response logging removed for production
});
