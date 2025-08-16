/**
 * Message types for chat completions
 */

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type MessageContent = string | (TextContent | ImageContent)[];

export interface Message {
  role: "system" | "user" | "assistant" | "function";
  content: MessageContent;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface ProcessedMessage extends Message {
  content: MessageContent;
}
