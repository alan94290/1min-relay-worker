/**
 * Rate limiting middleware using Cloudflare KV
 * Uses a simple sliding-window counter instead of storing full timestamp arrays.
 */

import { RATE_LIMIT_CONFIG } from "../constants";
import type { Env, RateLimitConfig, RateLimitRecord } from "../types";

export class RateLimiter {
  private env: Env;
  private config: RateLimitConfig;

  constructor(env: Env, config: RateLimitConfig = RATE_LIMIT_CONFIG) {
    this.env = env;
    this.config = config;
  }

  async checkRateLimit(
    clientId: string,
    tokenCount: number = 0,
  ): Promise<{ allowed: boolean }> {
    if (!this.env.RATE_LIMIT_STORE) {
      return { allowed: true };
    }

    const now = Date.now();

    try {
      const existingRecord = await this.env.RATE_LIMIT_STORE.get(clientId);
      let record: RateLimitRecord = existingRecord
        ? JSON.parse(existingRecord)
        : { requestCount: 0, tokenCount: 0, windowStart: now };

      // Reset if window has expired
      if (now - record.windowStart >= this.config.windowMs) {
        record = { requestCount: 0, tokenCount: 0, windowStart: now };
      }

      // Check request count limit
      if (record.requestCount >= this.config.maxRequests) {
        return { allowed: false };
      }

      // Check token count limit (if configured)
      if (
        this.config.maxTokens &&
        record.tokenCount + tokenCount > this.config.maxTokens
      ) {
        return { allowed: false };
      }

      // Update counters
      record.requestCount += 1;
      record.tokenCount += tokenCount;

      await this.env.RATE_LIMIT_STORE.put(clientId, JSON.stringify(record), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000) + 60,
      });

      return { allowed: true };
    } catch (error) {
      console.error("Rate limiting error:", error);
      return { allowed: true };
    }
  }

  async middleware(
    request: Request,
    tokenCount: number = 0,
  ): Promise<{ allowed: boolean }> {
    const clientId = getClientId(request);
    return this.checkRateLimit(clientId, tokenCount);
  }
}

/**
 * Extract client identifier from request headers for rate limiting.
 */
export function getClientId(request: Request): string {
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
