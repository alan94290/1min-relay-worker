import { createMiddleware } from "hono/factory";
import { HonoEnv } from "../types/hono";
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
  ModelNotFoundError,
  ApiError,
  toOpenAIError,
} from "../utils/errors";

export const errorHandler = createMiddleware<HonoEnv>(async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Request error:", {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
      url: c.req.url,
      method: c.req.method,
    });

    // Use the unified error handler for consistent OpenAI API format
    const errorData = toOpenAIError(error);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add retry-after header for rate limit errors
    if (error instanceof RateLimitError && (error as any).retryAfter) {
      headers["Retry-After"] = (error as any).retryAfter.toString();
    }

    return c.json(
      {
        error: {
          message: errorData.message,
          type: errorData.type,
          param: errorData.param,
          code: errorData.code,
        },
      },
      errorData.status as any,
      headers
    );
  }
});
