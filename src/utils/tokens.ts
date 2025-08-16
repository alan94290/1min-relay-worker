/**
 * Token calculation utility
 */

import { encode } from "gpt-tokenizer";

const CHAR_TO_TOKEN_RATIO = 4;
const TOKEN_CACHE = new Map<string, number>();
const MAX_CACHE_SIZE = 1000;

export function calculateTokens(
  text: string,
  model: string = "DEFAULT"
): number {
  // Check cache first for performance
  const cacheKey = `${model}:${text.length}:${text.slice(0, 50)}`;
  if (TOKEN_CACHE.has(cacheKey)) {
    return TOKEN_CACHE.get(cacheKey)!;
  }

  let tokenCount: number;

  try {
    const tokens = encode(text);
    tokenCount = tokens.length;
  } catch (error) {
    console.error("Token calculation failed:", error);
    // More accurate fallback calculation
    tokenCount = estimateTokenCount(text);
  }

  // Cache the result (with size limit)
  if (TOKEN_CACHE.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (simple FIFO)
    const firstKey = TOKEN_CACHE.keys().next().value;
    if (firstKey !== undefined) {
      TOKEN_CACHE.delete(firstKey);
    }
  }
  TOKEN_CACHE.set(cacheKey, tokenCount);

  return tokenCount;
}

function estimateTokenCount(text: string): number {
  // More sophisticated estimation than simple division
  // Account for whitespace, punctuation, and common patterns
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;

  // Heuristic: average English word is ~4-5 characters + space
  // Tokens are roughly 0.75 words on average
  const wordBasedEstimate = Math.ceil(words * 0.75);
  const charBasedEstimate = Math.ceil(chars / CHAR_TO_TOKEN_RATIO);

  // Use the higher estimate for safety in rate limiting
  return Math.max(wordBasedEstimate, charBasedEstimate);
}
