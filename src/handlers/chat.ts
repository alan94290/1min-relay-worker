/**
 * Chat completions endpoint handler
 */

import {
  Env,
  ChatCompletionRequest,
  Message,
  MessageContent,
  TextContent,
  ImageContent,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  OneMinResponse,
  OneMinStreamChunk,
} from "../types";
import { OneMinApiService } from "../services";
import {
  createErrorResponse,
  createSuccessResponse,
  createErrorResponseFromError,
  ModelParser,
  WebSearchConfig,
  ValidationError,
  ModelNotFoundError,
} from "../utils";
import {
  extractImageFromContent,
  isVisionSupportedModel,
} from "../utils/image";
import { ALL_ONE_MIN_AVAILABLE_MODELS, DEFAULT_MODEL } from "../constants";

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
      console.error("Chat completion error:", error);
      return createErrorResponseFromError(error);
    }
  }

  async handleChatCompletionsWithBody(
    requestBody: ChatCompletionRequest,
    apiKey: string
  ): Promise<Response> {
    try {
      // Validate required fields
      if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
        return createErrorResponse(
          "Messages field is required and must be an array"
        );
      }

      // Set default model if not provided
      const rawModel = requestBody.model || DEFAULT_MODEL;

      // Parse model name and get web search configuration
      const parseResult = this.parseAndValidateModel(rawModel);
      if (parseResult.error) {
        return createErrorResponse(
          parseResult.error,
          400,
          "invalid_request_error",
          "model_not_found"
        );
      }

      const { cleanModel, webSearchConfig } = parseResult;

      // Validate that the clean model exists in our supported models
      if (!ALL_ONE_MIN_AVAILABLE_MODELS.includes(cleanModel)) {
        throw new ModelNotFoundError(cleanModel);
      }

      // Check for images and validate vision model support
      const hasImages = this.checkForImages(requestBody.messages as Message[]);
      if (hasImages && !isVisionSupportedModel(cleanModel)) {
        return createErrorResponse(
          `Model '${cleanModel}' does not support image inputs`,
          400,
          "invalid_request_error",
          "model_not_supported"
        );
      }

      // Process messages and extract images if any
      const processedMessages = this.processMessages(
        requestBody.messages as Message[]
      );

      // Handle streaming vs non-streaming
      if (requestBody.stream) {
        return this.handleStreamingChat(
          processedMessages,
          cleanModel,
          requestBody.temperature,
          requestBody.max_tokens,
          apiKey,
          webSearchConfig
        );
      } else {
        return this.handleNonStreamingChat(
          processedMessages,
          cleanModel,
          requestBody.temperature,
          requestBody.max_tokens,
          apiKey,
          webSearchConfig
        );
      }
    } catch (error) {
      console.error("Chat completion error:", error);
      return createErrorResponseFromError(error);
    }
  }

  private parseAndValidateModel(modelName: string): {
    cleanModel: string;
    webSearchConfig?: WebSearchConfig;
    error?: string;
  } {
    return ModelParser.parseAndGetConfig(modelName, this.env);
  }

  private checkForImages(messages: Message[]): boolean {
    for (const message of messages) {
      if (Array.isArray(message.content)) {
        for (const item of message.content) {
          if (item.type === "image_url" && item.image_url?.url) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private processMessages(messages: Message[]): Message[] {
    return messages.map((message) => {
      // Handle vision inputs
      if (Array.isArray(message.content)) {
        const imageUrl = extractImageFromContent(message.content);
        if (imageUrl) {
          // Convert to format expected by 1min.ai API
          return {
            ...message,
            content: (message.content as (TextContent | ImageContent)[]).map(
              (item) => {
                if (item.type === "image_url") {
                  return {
                    type: "image_url",
                    image_url: { url: item.image_url.url },
                  };
                }
                return item;
              }
            ),
          };
        }
      }
      return message;
    });
  }

  private async handleNonStreamingChat(
    messages: Message[],
    model: string,
    temperature?: number,
    maxTokens?: number,
    apiKey?: string,
    webSearchConfig?: WebSearchConfig
  ): Promise<Response> {
    try {
      const requestBody = await this.apiService.buildChatRequestBody(
        messages,
        model,
        apiKey || "",
        temperature,
        maxTokens,
        webSearchConfig
      );

      const response = await this.apiService.sendChatRequest(
        requestBody,
        false,
        apiKey
      );
      const data = (await response.json()) as OneMinResponse;

      // Transform response to OpenAI format
      const openAIResponse = this.transformToOpenAIFormat(data, model);
      return createSuccessResponse(openAIResponse);
    } catch (error) {
      console.error("Non-streaming chat error:", error);
      return createErrorResponse("Failed to process chat completion", 500);
    }
  }

  private async handleStreamingChat(
    messages: Message[],
    model: string,
    temperature?: number,
    maxTokens?: number,
    apiKey?: string,
    webSearchConfig?: WebSearchConfig
  ): Promise<Response> {
    try {
      const requestBody = await this.apiService.buildStreamingChatRequestBody(
        messages,
        model,
        apiKey || "",
        temperature,
        maxTokens,
        webSearchConfig
      );

      const response = await this.apiService.sendChatRequest(
        requestBody,
        true,
        apiKey
      );

      // Create streaming response following original implementation
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) {
        await writer.close();
        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      // Start streaming process (don't await, let it run in background)
      (async () => {
        try {
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

            // Format chunk as OpenAI SSE
            const returnChunk: ChatCompletionStreamChunk = {
              id: `chatcmpl-${crypto.randomUUID()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [
                {
                  index: 0,
                  delta: {
                    content: chunk,
                  },
                  finish_reason: null as string | null,
                },
              ],
            };

            await writer.write(
              encoder.encode(`data: ${JSON.stringify(returnChunk)}\n\n`)
            );
          }

          // Send final chunk
          const finalChunk: ChatCompletionStreamChunk = {
            id: `chatcmpl-${crypto.randomUUID()}`,
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

          await writer.write(
            encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`)
          );
          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        } catch (error) {
          console.error("Streaming error:", error);
          await writer.abort(error);
        }
      })();

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } catch (error) {
      console.error("Streaming chat error:", error);
      return createErrorResponse(
        "Failed to process streaming chat completion",
        500
      );
    }
  }

  private transformToOpenAIFormat(
    data: OneMinResponse,
    model: string
  ): ChatCompletionResponse {
    return {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content:
              data.aiRecord?.aiRecordDetail?.resultObject?.[0] ||
              data.content ||
              "No response generated",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  }

  private transformStreamChunkToOpenAI(
    data: OneMinStreamChunk,
    model: string
  ): ChatCompletionStreamChunk {
    return {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          delta: {
            content: data.receivedMessage || "",
          },
          finish_reason: null,
        },
      ],
    };
  }
}
