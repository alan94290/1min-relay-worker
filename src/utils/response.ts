/**
 * Response utilities for consistent API responses
 */

import { CORS_HEADERS } from "../constants";

export function createErrorResponse(
  message: string,
  status: number = 400,
  errorType: string = "invalid_request_error",
  errorCode: string | null = null,
): Response {
  return new Response(
    JSON.stringify({
      error: {
        message,
        type: errorType,
        param: null,
        code: errorCode,
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    },
  );
}

export function createSuccessResponse(
  data: any,
  status: number = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

export function createCorsResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
