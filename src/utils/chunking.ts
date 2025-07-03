/**
 * Text chunking utilities for handling large translation requests
 */

export interface TextChunk {
  id: string;
  content: string;
  index: number;
  totalChunks: number;
  originalLength: number;
}

export class TextChunker {
  private static readonly MAX_CHUNK_SIZE = 2000; // Characters per chunk
  private static readonly OVERLAP_SIZE = 100; // Overlap between chunks for context
  
  /**
   * Split large text into manageable chunks
   */
  static chunkText(text: string, maxChunkSize: number = this.MAX_CHUNK_SIZE): TextChunk[] {
    if (text.length <= maxChunkSize) {
      return [{
        id: `chunk-0`,
        content: text,
        index: 0,
        totalChunks: 1,
        originalLength: text.length
      }];
    }
    
    const chunks: TextChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;
    
    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + maxChunkSize, text.length);
      
      // Try to break at sentence boundaries
      if (endIndex < text.length) {
        const sentenceEnd = this.findSentenceBreak(text, startIndex, endIndex);
        if (sentenceEnd > startIndex + maxChunkSize * 0.7) {
          endIndex = sentenceEnd;
        }
      }
      
      const chunkContent = text.substring(startIndex, endIndex);
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: chunkContent,
        index: chunkIndex,
        totalChunks: 0, // Will be updated after all chunks are created
        originalLength: text.length
      });
      
      // Move start index with overlap
      startIndex = Math.max(endIndex - this.OVERLAP_SIZE, endIndex);
      chunkIndex++;
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    return chunks;
  }
  
  /**
   * Find the best sentence break point near the target position
   */
  private static findSentenceBreak(text: string, start: number, target: number): number {
    const searchText = text.substring(start, target + 200); // Look ahead a bit
    const sentenceEnders = ['.', '!', '?', '\n', '。', '！', '？'];
    
    let bestBreak = target;
    let bestScore = 0;
    
    for (let i = searchText.length - 1; i >= Math.max(0, target - start - 200); i--) {
      const char = searchText[i];
      if (sentenceEnders.includes(char)) {
        const position = start + i + 1;
        const score = this.calculateBreakScore(position, target);
        if (score > bestScore) {
          bestScore = score;
          bestBreak = position;
        }
      }
    }
    
    return bestBreak;
  }
  
  /**
   * Calculate how good a break position is (closer to target = better)
   */
  private static calculateBreakScore(position: number, target: number): number {
    const distance = Math.abs(position - target);
    return Math.max(0, 100 - distance);
  }
  
  /**
   * Reconstruct original text from chunks (removing overlaps)
   */
  static reconstructText(chunks: TextChunk[]): string {
    if (chunks.length === 0) return '';
    if (chunks.length === 1) return chunks[0].content;
    
    // Sort chunks by index
    const sortedChunks = chunks.sort((a, b) => a.index - b.index);
    let result = sortedChunks[0].content;
    
    for (let i = 1; i < sortedChunks.length; i++) {
      const currentChunk = sortedChunks[i];
      const previousChunk = sortedChunks[i - 1];
      
      // Find overlap and remove it
      const overlap = this.findOverlap(previousChunk.content, currentChunk.content);
      const cleanContent = currentChunk.content.substring(overlap);
      result += cleanContent;
    }
    
    return result;
  }
  
  /**
   * Find overlap between two text chunks
   */
  private static findOverlap(text1: string, text2: string): number {
    const maxOverlap = Math.min(this.OVERLAP_SIZE * 2, text1.length, text2.length);
    
    for (let i = maxOverlap; i > 0; i--) {
      const suffix = text1.substring(text1.length - i);
      const prefix = text2.substring(0, i);
      if (suffix === prefix) {
        return i;
      }
    }
    
    return 0;
  }
}

/**
 * Subtitle-specific chunking for YouTube translations
 */
export class SubtitleChunker extends TextChunker {
  /**
   * Chunk subtitle text by preserving timing information
   */
  static chunkSubtitles(subtitles: string, maxChunkSize: number = 1500): TextChunk[] {
    // Split by common subtitle separators
    const lines = subtitles.split(/\n\n|\r\n\r\n/);
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          id: `subtitle-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          index: chunkIndex,
          totalChunks: 0,
          originalLength: subtitles.length
        });
        
        currentChunk = line;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + line;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `subtitle-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        index: chunkIndex,
        totalChunks: 0,
        originalLength: subtitles.length
      });
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });
    
    return chunks;
  }
}
