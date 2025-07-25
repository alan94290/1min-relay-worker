/**
 * Rate limiting middleware using Cloudflare KV
 */

import { Env, RateLimitRecord, RateLimitConfig } from "../types";
import { RATE_LIMIT_CONFIG } from "../constants";
import { createErrorResponse } from "../utils";

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
  ): Promise<{ allowed: boolean; response?: Response }> {
    if (!this.env.RATE_LIMIT_STORE) {
      // If no KV store is configured, allow all requests
      return { allowed: true };
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get existing rate limit record
      const existingRecord = await this.env.RATE_LIMIT_STORE.get(clientId);
      let record: RateLimitRecord = existingRecord
        ? JSON.parse(existingRecord)
        : { timestamps: [], tokenCount: 0 };

      // Filter out timestamps outside the current window
      record.timestamps = record.timestamps.filter(
        (timestamp) => timestamp > windowStart,
      );

      // Check request count limit
      if (record.timestamps.length >= this.config.maxRequests) {
        return {
          allowed: false,
          response: createErrorResponse(
            `Rate limit exceeded. Maximum ${this.config.maxRequests} requests per minute allowed.`,
            429,
          ),
        };
      }

      // Check token count limit (if configured)
      if (
        this.config.maxTokens &&
        record.tokenCount + tokenCount > this.config.maxTokens
      ) {
        return {
          allowed: false,
          response: createErrorResponse(
            `Token rate limit exceeded. Maximum ${this.config.maxTokens} tokens per minute allowed.`,
            429,
          ),
        };
      }

      // Update record
      record.timestamps.push(now);
      record.tokenCount = record.tokenCount + tokenCount;

      // Reset token count if we're starting a new window
      if (record.timestamps.length === 1) {
        record.tokenCount = tokenCount;
      }

      // Store updated record with TTL
      await this.env.RATE_LIMIT_STORE.put(clientId, JSON.stringify(record), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000) + 10,
      });

      return { allowed: true };
    } catch (error) {
      console.error("Rate limiting error:", error);
      // On error, allow the request to proceed
      return { allowed: true };
    }
  }

  private getClientId(request: Request): string {
    // Try to get client ID from various sources
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
      return `ip:${xForwardedFor.split(",")[0].trim()}`;
    }

    return "anonymous";
  }

  async middleware(
    request: Request,
    tokenCount: number = 0,
  ): Promise<{ allowed: boolean; response?: Response }> {
    const clientId = this.getClientId(request);
    return this.checkRateLimit(clientId, tokenCount);
  }
}
