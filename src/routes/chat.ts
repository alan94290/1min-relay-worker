import { Hono } from "hono";
import { HonoEnv } from "../types/hono";
import { ChatHandler } from "../handlers";
import { authMiddleware } from "../middleware/auth";
import { createRateLimitMiddleware } from "../middleware/rate-limit-hono";
import { calculateTokens } from "../utils";
import { extractTextFromContent } from "../utils/image";
import { ValidationError } from "../utils/errors";

const app = new Hono<HonoEnv>();

app.post("/completions", authMiddleware, async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch (error) {
    throw new ValidationError("Invalid JSON in request body");
  }

  const apiKey = c.get("apiKey");

  // Calculate tokens for rate limiting
  const messageText =
    body.messages
      ?.map((msg: any) => {
        if (typeof msg.content === "string") {
          return msg.content;
        } else if (Array.isArray(msg.content)) {
          return extractTextFromContent(msg.content);
        }
        return "";
      })
      .join(" ") || "";
  const tokenCount = calculateTokens(messageText, body.model);

  // Apply rate limiting with token count
  const rateLimitMiddleware = createRateLimitMiddleware(tokenCount);
  await rateLimitMiddleware(c, async () => {});

  const chatHandler = new ChatHandler(c.env);
  const response = await chatHandler.handleChatCompletionsWithBody(
    body,
    apiKey,
  );

  // Return the response directly since ChatHandler returns a Response object
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});

export default app;
