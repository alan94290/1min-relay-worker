/**
 * Shared streaming pipeline infrastructure
 * Eliminates duplicated TransformStream/reader/writer boilerplate across handlers
 */

import { createSSEResponse } from "./sse";
import { SimpleUTF8Decoder } from "./utf8-decoder";

export interface StreamingCallbacks {
  onStart?: (writer: WritableStreamDefaultWriter<Uint8Array>) => Promise<void>;
  onChunk: (
    writer: WritableStreamDefaultWriter<Uint8Array>,
    chunk: string,
  ) => Promise<void>;
  onEnd: (
    writer: WritableStreamDefaultWriter<Uint8Array>,
    accumulatedContent: string,
  ) => Promise<void>;
}

/**
 * Execute a streaming pipeline with the given callbacks.
 * Handles TransformStream setup, UTF-8 decoding, chunk accumulation,
 * and writer lifecycle (close/abort).
 */
export function executeStreamingPipeline(
  response: Response,
  callbacks: StreamingCallbacks,
): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const reader = response.body?.getReader();
  if (!reader) {
    // No body — close immediately and return empty SSE stream
    writer.close().catch(() => {});
    return createSSEResponse(readable);
  }

  // Fire-and-forget streaming IIFE
  (async () => {
    try {
      const utf8Decoder = new SimpleUTF8Decoder();
      const contentChunks: string[] = [];

      if (callbacks.onStart) {
        await callbacks.onStart(writer);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = utf8Decoder.decode(value, done);
        if (chunk) {
          contentChunks.push(chunk);
          await callbacks.onChunk(writer, chunk);
        }
      }

      const accumulatedContent = contentChunks.join("");
      await callbacks.onEnd(writer, accumulatedContent);
      await writer.close();
    } catch (error) {
      console.error("Streaming pipeline error:", error);
      await writer.abort(error);
    }
  })();

  return createSSEResponse(readable);
}
