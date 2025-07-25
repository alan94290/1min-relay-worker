/**
 * Token calculation utility
 */

import { encode } from "gpt-tokenizer";

export function calculateTokens(
  text: string,
  model: string = "DEFAULT",
): number {
  try {
    const tokens = encode(text);
    return tokens.length;
  } catch (error) {
    console.error("Token calculation failed:", error);
    return Math.ceil(text.length / 4);
  }
}
