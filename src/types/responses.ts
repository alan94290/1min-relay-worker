/**
 * Response type definitions for API endpoints
 */

export interface OneMinResponse {
  aiRecord: {
    aiRecordDetail: {
      resultObject: string[];
    };
  };
}

export interface OneMinImageResponse {
  aiRecord: {
    temporaryUrl?: string;
    aiRecordDetail: {
      resultObject: string[];
    };
  };
}

export interface RateLimitRecord {
  timestamps: number[];
  tokenCount: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window (milliseconds)
  maxRequests: number; // Maximum requests
  maxTokens?: number; // Maximum tokens (optional)
}
