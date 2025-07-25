import { createMiddleware } from "hono/factory";
import { HonoEnv } from "../types/hono";
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
  ApiError,
} from "../utils/errors";

export const errorHandler = createMiddleware<HonoEnv>(async (c, next) => {
  try {
    await next();
  } catch (error: any) {
    console.error("Request error:", {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
      url: c.req.url,
      method: c.req.method,
    });

    if (error instanceof ValidationError) {
      return c.json(
        {
          error: {
            message: error.message,
            type: "invalid_request_error",
            param: null,
            code: null,
          },
        },
        400,
      );
    }

    if (error instanceof AuthenticationError) {
      return c.json(
        {
          error: {
            message: error.message,
            type: "invalid_request_error",
            param: null,
            code: "invalid_api_key",
          },
        },
        401,
      );
    }

    if (error instanceof RateLimitError) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (error.retryAfter) {
        headers["Retry-After"] = error.retryAfter.toString();
      }

      return c.json(
        {
          error: {
            message: error.message,
            type: "rate_limit_error",
            param: null,
            code: "rate_limit_exceeded",
          },
        },
        429,
        headers,
      );
    }

    if (error instanceof ApiError) {
      return c.json(
        {
          error: {
            message: error.message,
            type: "api_error",
            param: null,
            code: error.code || "api_error",
          },
        },
        500,
      );
    }

    // Handle any other errors
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
  }
});
