/**
 * Enhanced logging utility for debugging translation performance
 */

export interface TranslationMetrics {
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  textLength: number;
  chunkCount?: number;
  model: string;
  status: 'started' | 'completed' | 'failed' | 'timeout';
  error?: string;
}

export class TranslationLogger {
  private static metrics: Map<string, TranslationMetrics> = new Map();
  
  static startTranslation(requestId: string, textLength: number, model: string): void {
    const metrics: TranslationMetrics = {
      requestId,
      startTime: Date.now(),
      textLength,
      model,
      status: 'started'
    };
    
    this.metrics.set(requestId, metrics);
    console.log(`[TRANSLATION-START] ${requestId} - Text length: ${textLength}, Model: ${model}`);
  }
  
  static completeTranslation(requestId: string, chunkCount?: number): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.status = 'completed';
      metrics.chunkCount = chunkCount;
      
      console.log(`[TRANSLATION-COMPLETE] ${requestId} - Duration: ${metrics.duration}ms, Chunks: ${chunkCount || 1}`);
      
      // Performance warning
      if (metrics.duration > 45000) {
        console.warn(`[TRANSLATION-WARNING] ${requestId} - Duration ${metrics.duration}ms exceeds CF Worker limits`);
      }
    }
  }
  
  static failTranslation(requestId: string, error: string): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      metrics.status = 'failed';
      metrics.error = error;
      
      console.error(`[TRANSLATION-FAILED] ${requestId} - Duration: ${metrics.duration}ms, Error: ${error}`);
    }
  }
  
  static getMetrics(requestId: string): TranslationMetrics | undefined {
    return this.metrics.get(requestId);
  }
  
  static getAllMetrics(): TranslationMetrics[] {
    return Array.from(this.metrics.values());
  }
  
  static clearMetrics(): void {
    this.metrics.clear();
  }
}

export function logRequestDetails(request: Request, body: any): void {
  let pathname = 'unknown';
  try {
    const url = new URL(request.url);
    pathname = url.pathname;
  } catch (error) {
    // Handle invalid URL gracefully
    pathname = request.url || 'unknown';
  }
  
  const userAgent = request.headers.get('User-Agent') || 'Unknown';
  const contentLength = request.headers.get('Content-Length') || 'Unknown';
  
  console.log(`[REQUEST-DETAILS] ${request.method} ${pathname}`);
  console.log(`[REQUEST-HEADERS] User-Agent: ${userAgent.substring(0, 100)}...`);
  console.log(`[REQUEST-HEADERS] Content-Length: ${contentLength}`);
  
  if (body && body.messages) {
    const totalTextLength = body.messages
      .map((msg: any) => typeof msg.content === 'string' ? msg.content.length : 0)
      .reduce((sum: number, len: number) => sum + len, 0);
    
    console.log(`[REQUEST-CONTENT] Messages: ${body.messages.length}, Total text length: ${totalTextLength}`);
    console.log(`[REQUEST-CONTENT] Model: ${body.model || 'default'}, Stream: ${body.stream || false}`);
  }
}
