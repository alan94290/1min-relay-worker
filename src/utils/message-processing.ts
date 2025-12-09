/**
 * Shared message processing utilities
 * Used by chat and responses handlers
 */

import { Message, TextContent, ImageContent, Env } from "../types";
import { extractImageFromContent } from "./image";
import { ModelParser, WebSearchConfig } from "./model-parser";

/**
 * Check if messages contain any images
 */
export function checkForImages(messages: Message[]): boolean {
  for (const message of messages) {
    if (Array.isArray(message.content)) {
      for (const item of message.content) {
        if (item.type === "image_url" && item.image_url?.url) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Process messages and convert image format for 1min.ai API
 */
export function processMessages(messages: Message[]): Message[] {
  return messages.map((message) => {
    // Handle vision inputs
    if (Array.isArray(message.content)) {
      const imageUrl = extractImageFromContent(message.content);
      if (imageUrl) {
        // Convert to format expected by 1min.ai API
        return {
          ...message,
          content: (message.content as (TextContent | ImageContent)[]).map(
            (item) => {
              if (item.type === "image_url") {
                return {
                  type: "image_url",
                  image_url: { url: item.image_url.url },
                };
              }
              return item;
            }
          ),
        };
      }
    }
    return message;
  });
}

/**
 * Parse and validate model name, returning clean model and web search config
 */
export function parseAndValidateModel(
  modelName: string,
  env: Env
): {
  cleanModel: string;
  webSearchConfig?: WebSearchConfig;
  error?: string;
} {
  return ModelParser.parseAndGetConfig(modelName, env);
}
