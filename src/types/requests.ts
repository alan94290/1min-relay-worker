/**
 * Request type definitions for API endpoints
 */

export interface ChatCompletionRequest {
  model?: string;
  messages: Array<{
    role: string;
    content:
      | string
      | Array<{
          type: string;
          text?: string;
          image_url?: {
            url: string;
          };
        }>;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ImageGenerationRequest {
  model?: string;
  prompt: string;
  n?: number;
  size?: string;
}

export interface ResponseRequest {
  model?: string;
  // Support both input (simple) and messages (conversational) formats
  input?: string;
  messages?: Array<{
    role: string;
    content:
      | string
      | Array<{
          type: string;
          text?: string;
          image_url?: {
            url: string;
          };
        }>;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "text" | "json_object" | "json_schema";
    json_schema?: {
      name: string;
      description?: string;
      schema: object;
      strict?: boolean;
    };
  };
  reasoning_effort?: "low" | "medium" | "high";
}
