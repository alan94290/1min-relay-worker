import { createMiddleware } from "hono/factory";
import { HonoEnv, RateLimitInfo } from "../types/hono";
import { RateLimitError } from "../utils/errors";
import { RateLimiter } from "./rate-limit";

export const createRateLimitMiddleware = (tokenCount: number = 0) => {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const rateLimiter = new RateLimiter(c.env);
    const result = await rateLimiter.middleware(c.req.raw, tokenCount);

    if (!result.allowed) {
      throw new RateLimitError("Rate limit exceeded");
    }

    const rateLimitInfo: RateLimitInfo = {
      clientId: getClientId(c.req.raw),
      tokenCount,
      allowed: result.allowed,
      requestCount: 1,
      remaining: 0,
      resetTime: Date.now() + 60000,
    };

    c.set("rateLimitInfo", rateLimitInfo);
    await next();
  });
};

function getClientId(request: Request): string {
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    return `auth:${authHeader.substring(0, 20)}`;
  }

  const cfConnectingIp = request.headers.get("CF-Connecting-IP");
  if (cfConnectingIp) {
    return `ip:${cfConnectingIp}`;
  }

  const xForwardedFor = request.headers.get("X-Forwarded-For");
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(",")[0];
    return firstIp ? `ip:${firstIp.trim()}` : "anonymous";
  }

  return "anonymous";
}

export const rateLimitMiddleware = createRateLimitMiddleware();
