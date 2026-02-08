import { Hono } from "hono";
import { HonoEnv } from "../types/hono";
import { AnthropicMessageRequest } from "../types";
import { MessagesHandler } from "../handlers/messages";
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
  let body: AnthropicMessageRequest;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError("Invalid JSON in request body");
  }

  const apiKey = c.get("apiKey");

  // Calculate tokens for rate limiting
  const messageText = extractAllMessageText(body.messages ?? []);

  // Include system message in token count
  let systemText = "";
  if (typeof body.system === "string") {
    systemText = body.system;
  } else if (Array.isArray(body.system)) {
    systemText = body.system.map((b) => b.text).join(" ");
  }

  const tokenCount = calculateTokens(
    `${systemText} ${messageText}`.trim(),
    body.model,
  );

  // Apply rate limiting with token count
  const rateLimitMiddleware = createRateLimitMiddleware(tokenCount);
  await rateLimitMiddleware(c, async () => {});

  const messagesHandler = new MessagesHandler(c.env);
  const response = await messagesHandler.handleMessages(body, apiKey);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});

export default app;
