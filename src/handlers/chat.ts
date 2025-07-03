/**
 * Chat completions endpoint handler
 */

import { Env, ChatCompletionRequest } from '../types';
import { OneMinApiService } from '../services';
import { calculateTokens, generateUUID, extractImageFromContent, createErrorResponse, createSuccessResponse } from '../utils';
import { TranslationLogger, logRequestDetails } from '../utils/logger';
import { TextChunker, SubtitleChunker, TextChunk } from '../utils/chunking';
import { ALL_ONE_MIN_AVAILABLE_MODELS, DEFAULT_MODEL } from '../constants';

export class ChatHandler {
  private env: Env;
  private apiService: OneMinApiService;

  constructor(env: Env) {
    this.env = env;
    this.apiService = new OneMinApiService(env);
  }

  async handleChatCompletions(request: Request): Promise<Response> {
    try {
      const requestBody: ChatCompletionRequest = await request.json();
      return await this.handleChatCompletionsWithBody(requestBody, "");
    } catch (error) {
      console.error('Chat completion error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  }

  async handleChatCompletionsWithBody(requestBody: ChatCompletionRequest, apiKey: string): Promise<Response> {
    const requestId = generateUUID();
    
    try {
      // Log request details
      console.log(`[REQUEST-DETAILS] POST /v1/chat/completions`);
      console.log(`[REQUEST-CONTENT] Messages: ${requestBody.messages?.length || 0}`);
      console.log(`[REQUEST-CONTENT] Model: ${requestBody.model || 'default'}, Stream: ${requestBody.stream || false}`);
      
      // Validate required fields
      if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
        return createErrorResponse('Messages field is required and must be an array');
      }

      // Set default model if not provided
      const model = requestBody.model || DEFAULT_MODEL;
      
      // Validate model
      if (!ALL_ONE_MIN_AVAILABLE_MODELS.includes(model)) {
        return createErrorResponse(`Model '${model}' is not supported`);
      }

      // Calculate total text length for logging
      const totalTextLength = requestBody.messages
        .map(msg => typeof msg.content === 'string' ? msg.content.length : 0)
        .reduce((sum, len) => sum + len, 0);
      
      // Start translation logging
      TranslationLogger.startTranslation(requestId, totalTextLength, model);
      
      // Check if text is too long and needs chunking
      const shouldChunk = totalTextLength > 2000;
      
      if (shouldChunk) {
        console.log(`[CHUNKING] Request ${requestId} - Text length ${totalTextLength} exceeds limit, chunking enabled`);
        return this.handleChunkedTranslation(requestBody, model, apiKey, requestId);
      }

      // Process messages and extract images if any
      const processedMessages = this.processMessages(requestBody.messages);
      
      // Handle streaming vs non-streaming
      if (requestBody.stream) {
        return this.handleStreamingChat(processedMessages, model, requestBody.temperature, requestBody.max_tokens, apiKey, requestId);
      } else {
        return this.handleNonStreamingChat(processedMessages, model, requestBody.temperature, requestBody.max_tokens, apiKey, requestId);
      }
    } catch (error) {
      console.error('Chat completion error:', error);
      TranslationLogger.failTranslation(requestId, error instanceof Error ? error.message : 'Unknown error');
      return createErrorResponse('Internal server error', 500);
    }
  }

  private processMessages(messages: any[]): any[] {
    return messages.map(message => {
      // Handle vision inputs
      if (Array.isArray(message.content)) {
        const imageUrl = extractImageFromContent(message.content);
        if (imageUrl) {
          // Convert to format expected by 1min.ai API
          return {
            ...message,
            content: message.content.map((item: any) => {
              if (item.type === 'image_url') {
                return {
                  type: 'image_url',
                  image_url: { url: item.image_url.url }
                };
              }
              return item;
            })
          };
        }
      }
      return message;
    });
  }

  private async handleNonStreamingChat(
    messages: any[], 
    model: string, 
    temperature?: number, 
    maxTokens?: number,
    apiKey?: string,
    requestId?: string
  ): Promise<Response> {
    const requestBody = this.apiService.buildChatRequestBody(messages, model, temperature, maxTokens);
    
    try {
      const response = await this.apiService.sendChatRequest(requestBody, false, apiKey);
      const data = await response.json();
      
      // Transform response to OpenAI format
      const openAIResponse = this.transformToOpenAIFormat(data, model);
      
      // Log completion
      if (requestId) {
        TranslationLogger.completeTranslation(requestId);
      }
      
      return createSuccessResponse(openAIResponse);
    } catch (error) {
      console.error('Non-streaming chat error:', error);
      if (requestId) {
        TranslationLogger.failTranslation(requestId, error instanceof Error ? error.message : 'Unknown error');
      }
      return createErrorResponse('Failed to process chat completion', 500);
    }
  }

  private async handleStreamingChat(
    messages: any[], 
    model: string, 
    temperature?: number, 
    maxTokens?: number,
    apiKey?: string,
    requestId?: string
  ): Promise<Response> {
    const requestBody = this.apiService.buildStreamingChatRequestBody(messages, model, temperature, maxTokens);
    
    try {
      const response = await this.apiService.sendChatRequest(requestBody, true, apiKey);
      
      // Create streaming response following original implementation
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      
      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) {
        await writer.close();
        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

      // Start streaming process (don't await, let it run in background)
      (async () => {
        try {
          let allChunks = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            allChunks += chunk;

            // Format chunk as OpenAI SSE
            const returnChunk = {
              id: `chatcmpl-${generateUUID()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [
                {
                  index: 0,
                  delta: {
                    content: chunk,
                  },
                  finish_reason: null,
                },
              ],
            };

            await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(returnChunk)}\n\n`));
          }

          // Send final chunk
          const finalChunk = {
            id: `chatcmpl-${generateUUID()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop",
              },
            ],
          };

          await writer.write(new TextEncoder().encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
          await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
          await writer.close();
          
          // Log completion
          if (requestId) {
            TranslationLogger.completeTranslation(requestId);
          }
        } catch (error) {
          console.error('Streaming error:', error);
          if (requestId) {
            TranslationLogger.failTranslation(requestId, error instanceof Error ? error.message : 'Unknown error');
          }
          await writer.abort(error);
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    } catch (error) {
      console.error('Streaming chat error:', error);
      if (requestId) {
        TranslationLogger.failTranslation(requestId, error instanceof Error ? error.message : 'Unknown error');
      }
      return createErrorResponse('Failed to process streaming chat completion', 500);
    }
  }

  /**
   * Handle large translation requests by chunking them
   */
  private async handleChunkedTranslation(
    requestBody: ChatCompletionRequest,
    model: string,
    apiKey: string,
    requestId: string
  ): Promise<Response> {
    try {
      // Extract text content from messages
      const textContent = requestBody.messages
        .map(msg => typeof msg.content === 'string' ? msg.content : '')
        .join(' ');
      
      // Determine if this looks like subtitles
      const isSubtitles = this.detectSubtitles(textContent);
      
      // Choose appropriate chunking strategy
      const chunks = isSubtitles 
        ? SubtitleChunker.chunkSubtitles(textContent, 1500)
        : TextChunker.chunkText(textContent, 2000);
      
      console.log(`[CHUNKING] Processing ${chunks.length} chunks for request ${requestId}`);
      
      // Process chunks sequentially to avoid overwhelming the API
      const translatedChunks: string[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[CHUNKING] Processing chunk ${i + 1}/${chunks.length} (${chunk.content.length} chars)`);
        
        // Create a modified request for this chunk
        const chunkRequest = {
          ...requestBody,
          messages: [{
            role: 'user',
            content: chunk.content
          }]
        };
        
        // Process this chunk
        const chunkMessages = this.processMessages(chunkRequest.messages);
        const response = await this.handleNonStreamingChat(
          chunkMessages, 
          model, 
          requestBody.temperature, 
          requestBody.max_tokens, 
          apiKey
        );
        
        if (!response.ok) {
          throw new Error(`Chunk ${i + 1} failed with status ${response.status}`);
        }
        
        const chunkResult = await response.json() as any;
        const translatedText = chunkResult.choices?.[0]?.message?.content || '';
        translatedChunks.push(translatedText);
        
        // Small delay between chunks to be respectful to the API
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Combine all translated chunks
      const finalTranslation = translatedChunks.join(isSubtitles ? '\n\n' : ' ');
      
      // Create final response in OpenAI format
      const openAIResponse = {
        id: `chatcmpl-${generateUUID()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: finalTranslation
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: Math.floor(textContent.length / 4), // Rough estimate
          completion_tokens: Math.floor(finalTranslation.length / 4),
          total_tokens: Math.floor((textContent.length + finalTranslation.length) / 4)
        }
      };
      
      // Log successful completion
      TranslationLogger.completeTranslation(requestId, chunks.length);
      
      return createSuccessResponse(openAIResponse);
      
    } catch (error) {
      console.error('Chunked translation error:', error);
      TranslationLogger.failTranslation(requestId, error instanceof Error ? error.message : 'Unknown error');
      return createErrorResponse('Failed to process chunked translation', 500);
    }
  }
  
  /**
   * Detect if text content looks like subtitles
   */
  private detectSubtitles(text: string): boolean {
    // Look for common subtitle patterns
    const subtitlePatterns = [
      /\d{2}:\d{2}:\d{2}[,.]\d{3}/, // Timestamp format
      /^\d+$/m, // Sequence numbers
      /-->/, // SRT arrow
      /<[^>]+>/, // HTML-like tags
      /\[\w+\]/ // Bracket annotations
    ];
    
    return subtitlePatterns.some(pattern => pattern.test(text));
  }

  private transformToOpenAIFormat(data: any, model: string): any {
    return {
      id: `chatcmpl-${generateUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.aiRecord?.aiRecordDetail?.resultObject?.[0] || data.content || 'No response generated'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  }

  private transformStreamChunkToOpenAI(data: any, model: string): any {
    return {
      id: `chatcmpl-${generateUUID()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        delta: {
          content: data.content || data.aiRecord?.aiRecordDetail?.resultObject?.[0] || ''
        },
        finish_reason: data.finish_reason || null
      }]
    };
  }
}
