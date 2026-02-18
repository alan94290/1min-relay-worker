/**
 * Response utilities for consistent API responses
 *
 * CORS headers are handled globally by the Hono CORS middleware (src/middleware/cors.ts).
 * Response utilities should NOT add CORS headers manually.
 */

import type { OneMinChatResponse } from "../types";
import { toOpenAIError } from "./errors";

/**
 * Extract text content from a 1min.ai response, with consistent fallback logic.
 */
export function extractOneMinContent(data: OneMinChatResponse): string {
  return (
    data.aiRecord?.aiRecordDetail?.resultObject?.[0] ||
    data.content ||
    "No response generated"
  );
}

export function createErrorResponse(
  message: string,
  status: number = 400,
  errorType: string = "invalid_request_error",
  errorCode: string | null = null,
  param: string | null = null,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        message,
        type: errorType,
        param: param,
        code: errorCode,
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export function createSuccessResponse<T = unknown>(
  data: T,
  status: number = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function createErrorResponseFromError(error: unknown): Response {
  const errorData = toOpenAIError(error);
  return createErrorResponse(
    errorData.message,
    errorData.status,
    errorData.type,
    errorData.code,
    errorData.param,
  );
}
