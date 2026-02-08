import { Hono } from "hono";
import { HonoEnv } from "../types/hono";
import { ResponseRequest } from "../types";
import { ResponseHandler } from "../handlers";
import { authMiddleware } from "../middleware/auth";
import { createRateLimitMiddleware } from "../middleware/rate-limit-hono";
import {
  calculateTokens,
  extractAllMessageText,
  extractTextFromMessageContent,
} from "../utils";
import { ValidationError } from "../utils/errors";

const app = new Hono<HonoEnv>();

app.post("/", authMiddleware, async (c) => {
  let body: ResponseRequest;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError("Invalid JSON in request body");
  }

  const apiKey = c.get("apiKey");

  // Calculate tokens for rate limiting
  let messageText = "";
  if (typeof body.input === "string") {
    messageText = body.input;
  } else if (body.messages) {
    messageText = extractAllMessageText(body.messages);
  }
  const tokenCount = calculateTokens(messageText, body.model);

  // Apply rate limiting with token count
  const rateLimitMiddleware = createRateLimitMiddleware(tokenCount);
  await rateLimitMiddleware(c, async () => {});

  const responseHandler = new ResponseHandler(c.env);
  const response = await responseHandler.handleResponsesWithBody(body, apiKey);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});

export default app;
