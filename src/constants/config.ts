/**
 * Configuration constants
 */

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 180, // Maximum 180 requests per minute
  maxTokens: 100000, // Maximum 100k tokens per minute
};

// Default model configuration
export const DEFAULT_MODEL = "mistral-nemo";
export const DEFAULT_IMAGE_MODEL = "flux-schnell";

// CORS configuration
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// API endpoints
export const API_ENDPOINTS = {
  CHAT_COMPLETIONS: "/v1/chat/completions",
  RESPONSES: "/v1/responses",
  IMAGES_GENERATIONS: "/v1/images/generations",
  MODELS: "/v1/models",
} as const;
