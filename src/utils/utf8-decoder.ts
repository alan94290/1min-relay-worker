/**
 * UTF-8 Safe Streaming Decoder
 * Handles multi-byte UTF-8 characters that may be split across chunk boundaries
 */

export class UTF8SafeDecoder {
  private decoder: TextDecoder;
  private pendingBytes: Uint8Array | null = null;

  constructor() {
    // Use 'stream' option to handle incomplete sequences
    this.decoder = new TextDecoder("utf-8", {
      fatal: false, // Don't throw on invalid sequences
      ignoreBOM: true,
    });
  }

  /**
   * Decode a chunk of bytes, handling incomplete UTF-8 sequences
   * @param chunk - The bytes to decode
   * @param isLastChunk - Whether this is the final chunk
   * @returns Decoded string
   */
  decode(chunk: Uint8Array, isLastChunk: boolean = false): string {
    let bytesToDecode: Uint8Array;

    // Combine with pending bytes from previous chunk if any
    if (this.pendingBytes) {
      const combined = new Uint8Array(this.pendingBytes.length + chunk.length);
      combined.set(this.pendingBytes, 0);
      combined.set(chunk, this.pendingBytes.length);
      bytesToDecode = combined;
      this.pendingBytes = null;
    } else {
      bytesToDecode = chunk;
    }

    if (isLastChunk) {
      // For the last chunk, decode everything
      return this.decoder.decode(bytesToDecode, { stream: false });
    }

    // Find the last complete UTF-8 character boundary
    const lastCompleteIndex = this.findLastCompleteCharBoundary(bytesToDecode);

    if (lastCompleteIndex < bytesToDecode.length) {
      // Save incomplete bytes for next chunk
      this.pendingBytes = bytesToDecode.slice(lastCompleteIndex);
      bytesToDecode = bytesToDecode.slice(0, lastCompleteIndex);
    }

    // Decode only complete characters
    return this.decoder.decode(bytesToDecode, { stream: true });
  }

  /**
   * Find the last complete UTF-8 character boundary in the buffer
   */
  private findLastCompleteCharBoundary(bytes: Uint8Array): number {
    let i = bytes.length - 1;

    // Work backwards to find a valid UTF-8 sequence start
    while (i >= 0 && i >= bytes.length - 4) {
      const byte = bytes[i];
      if (byte === undefined) break;

      // Check if this is a valid UTF-8 sequence start
      if ((byte & 0x80) === 0) {
        // ASCII character (0xxxxxxx)
        return i + 1;
      } else if ((byte & 0xe0) === 0xc0) {
        // 2-byte sequence start (110xxxxx)
        if (i + 2 <= bytes.length) {
          return i + 2;
        }
        return i;
      } else if ((byte & 0xf0) === 0xe0) {
        // 3-byte sequence start (1110xxxx)
        if (i + 3 <= bytes.length) {
          return i + 3;
        }
        return i;
      } else if ((byte & 0xf8) === 0xf0) {
        // 4-byte sequence start (11110xxx)
        if (i + 4 <= bytes.length) {
          return i + 4;
        }
        return i;
      }

      i--;
    }

    return bytes.length;
  }

  /**
   * Reset the decoder state
   */
  reset(): void {
    this.pendingBytes = null;
    this.decoder = new TextDecoder("utf-8", {
      fatal: false,
      ignoreBOM: true,
    });
  }
}

/**
 * Alternative simple approach using TextDecoder's stream option
 */
export class SimpleUTF8Decoder {
  private decoder: TextDecoder;

  constructor() {
    this.decoder = new TextDecoder("utf-8", {
      fatal: false,
      ignoreBOM: true,
    });
  }

  decode(chunk: Uint8Array, isLastChunk: boolean = false): string {
    // TextDecoder with stream: true handles incomplete sequences automatically
    return this.decoder.decode(chunk, { stream: !isLastChunk });
  }

  reset(): void {
    this.decoder = new TextDecoder("utf-8", {
      fatal: false,
      ignoreBOM: true,
    });
  }
}
