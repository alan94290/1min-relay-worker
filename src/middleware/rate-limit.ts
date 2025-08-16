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
    tokenCount: number = 0
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
        : { timestamps: [], tokenCount: 0, windowStart: now };

      // Check if we need to reset the window
      const needsReset =
        !record.windowStart || now - record.windowStart >= this.config.windowMs;

      if (needsReset) {
        // Reset counters for new window
        record = {
          timestamps: [],
          tokenCount: 0,
          windowStart: now,
        };
      } else {
        // Clean up old timestamps (only keep current window)
        record.timestamps = record.timestamps.filter(
          (timestamp) => timestamp > windowStart
        );
      }

      // Check request count limit
      if (record.timestamps.length >= this.config.maxRequests) {
        const retryAfter = Math.ceil(
          ((record.windowStart ?? now) + this.config.windowMs - now) / 1000
        );
        return {
          allowed: false,
          response: this.createRateLimitResponse(
            `Rate limit exceeded. Maximum ${this.config.maxRequests} requests per minute allowed.`,
            retryAfter
          ),
        };
      }

      // Check token count limit (if configured)
      if (
        this.config.maxTokens &&
        record.tokenCount + tokenCount > this.config.maxTokens
      ) {
        const retryAfter = Math.ceil(
          ((record.windowStart ?? now) + this.config.windowMs - now) / 1000
        );
        return {
          allowed: false,
          response: this.createRateLimitResponse(
            `Token rate limit exceeded. Maximum ${this.config.maxTokens} tokens per minute allowed.`,
            retryAfter
          ),
        };
      }

      // Update record efficiently
      record.timestamps.push(now);
      record.tokenCount += tokenCount;

      // Store updated record with proper TTL
      await this.env.RATE_LIMIT_STORE.put(clientId, JSON.stringify(record), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000) + 60, // Extra buffer
      });

      return { allowed: true };
    } catch (error) {
      console.error("Rate limiting error:", error);
      // On error, allow the request to proceed
      return { allowed: true };
    }
  }

  private createRateLimitResponse(
    message: string,
    retryAfter: number
  ): Response {
    return new Response(
      JSON.stringify({
        error: {
          message,
          type: "rate_limit_error",
          param: null,
          code: "rate_limit_exceeded",
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
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
      const firstIp = xForwardedFor.split(",")[0];
      return firstIp ? `ip:${firstIp.trim()}` : "anonymous";
    }

    return "anonymous";
  }

  async middleware(
    request: Request,
    tokenCount: number = 0
  ): Promise<{ allowed: boolean; response?: Response }> {
    const clientId = this.getClientId(request);
    return this.checkRateLimit(clientId, tokenCount);
  }
}
