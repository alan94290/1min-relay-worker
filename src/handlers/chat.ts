/**
 * Chat completions endpoint handler
 */

import {
  Env,
  Message,
  ChatCompletionResponse,
  OneMinChatResponse,
  ChatCompletionRequest,
} from "../types";
import { OneMinApiService } from "../services";
import {
  createErrorResponse,
  createSuccessResponse,
  createErrorResponseFromError,
  WebSearchConfig,
  ModelNotFoundError,
  processMessagesWithImageCheck,
  parseAndValidateModel,
} from "../utils";
import {
  createOpenAISSEChunk,
  writeSSEEvent,
  writeSSEDone,
  createSSEResponse,
} from "../utils/sse";
import { supportsVision } from "../utils/model-capabilities";
import { SimpleUTF8Decoder } from "../utils/utf8-decoder";
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
    apiKey: string,
  ): Promise<Response> {
    try {
      // Validate required fields
      if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
        return createErrorResponse(
          "Messages field is required and must be an array",
        );
      }

      // Set default model if not provided
      const rawModel = requestBody.model || DEFAULT_MODEL;

      // Parse model name and get web search configuration
      const parseResult = parseAndValidateModel(rawModel, this.env);
      if (parseResult.error) {
        return createErrorResponse(
          parseResult.error,
          400,
          "invalid_request_error",
          "model_not_found",
        );
      }

      const { cleanModel, webSearchConfig } = parseResult;

      // Validate that the clean model exists in our supported models
      if (!ALL_ONE_MIN_AVAILABLE_MODELS.includes(cleanModel)) {
        throw new ModelNotFoundError(cleanModel);
      }

      // Process messages and check for images in a single pass
      const { processedMessages, hasImages } = processMessagesWithImageCheck(
        requestBody.messages as Message[],
      );
      if (hasImages && !supportsVision(cleanModel)) {
        return createErrorResponse(
          `Model '${cleanModel}' does not support image inputs`,
          400,
          "invalid_request_error",
          "model_not_supported",
        );
      }

      // Handle streaming vs non-streaming
      if (requestBody.stream) {
        return this.handleStreamingChat(
          processedMessages,
          cleanModel,
          requestBody.temperature,
          requestBody.max_tokens,
          apiKey,
          webSearchConfig,
        );
      } else {
        return this.handleNonStreamingChat(
          processedMessages,
          cleanModel,
          requestBody.temperature,
          requestBody.max_tokens,
          apiKey,
          webSearchConfig,
        );
      }
    } catch (error) {
      console.error("Chat completion error:", error);
      return createErrorResponseFromError(error);
    }
  }

  private async handleNonStreamingChat(
    messages: Message[],
    model: string,
    temperature?: number,
    maxTokens?: number,
    apiKey?: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    try {
      const requestBody = await this.apiService.buildChatRequestBody(
        messages,
        model,
        apiKey || "",
        temperature,
        maxTokens,
        webSearchConfig,
      );

      const response = await this.apiService.sendChatRequest(
        requestBody,
        false,
        apiKey,
      );
      const data = (await response.json()) as OneMinChatResponse;

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
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    try {
      const requestBody = await this.apiService.buildChatRequestBody(
        messages,
        model,
        apiKey || "",
        temperature,
        maxTokens,
        webSearchConfig,
      );

      const response = await this.apiService.sendChatRequest(
        requestBody,
        true,
        apiKey,
      );

      // Create streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) {
        await writer.close();
        return createSSEResponse(readable);
      }

      // Start streaming process (don't await, let it run in background)
      (async () => {
        try {
          const utf8Decoder = new SimpleUTF8Decoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = utf8Decoder.decode(value, done);
            const returnChunk = createOpenAISSEChunk(
              model,
              { content: chunk },
              null,
            );
            await writeSSEEvent(writer, returnChunk);
          }

          // Send final chunk
          const finalChunk = createOpenAISSEChunk(model, {}, "stop");
          await writeSSEEvent(writer, finalChunk);
          await writeSSEDone(writer);
          await writer.close();
        } catch (error) {
          console.error("Streaming error:", error);
          await writer.abort(error);
        }
      })();

      return createSSEResponse(readable);
    } catch (error) {
      console.error("Streaming chat error:", error);
      return createErrorResponse(
        "Failed to process streaming chat completion",
        500,
      );
    }
  }

  private transformToOpenAIFormat(
    data: OneMinChatResponse,
    model: string,
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
}
