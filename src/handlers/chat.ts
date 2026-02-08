/**
 * Chat completions endpoint handler
 */

import {
  Message,
  ChatCompletionResponse,
  OneMinChatResponse,
  ChatCompletionRequest,
} from "../types";
import {
  createErrorResponse,
  createSuccessResponse,
  createErrorResponseFromError,
  WebSearchConfig,
  validateModelAndMessages,
} from "../utils";
import {
  createOpenAISSEChunk,
  writeSSEEvent,
  writeSSEDone,
} from "../utils/sse";
import { executeStreamingPipeline } from "../utils/streaming";
import { DEFAULT_MODEL } from "../constants";
import { BaseTextHandler } from "./base";

export class ChatHandler extends BaseTextHandler {
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

      const rawModel = requestBody.model || DEFAULT_MODEL;

      const { cleanModel, webSearchConfig, processedMessages } =
        validateModelAndMessages(
          rawModel,
          requestBody.messages as Message[],
          this.env,
        );

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

      return executeStreamingPipeline(response, {
        onChunk: async (writer, chunk) => {
          const returnChunk = createOpenAISSEChunk(
            model,
            { content: chunk },
            null,
          );
          await writeSSEEvent(writer, returnChunk);
        },
        onEnd: async (writer) => {
          const finalChunk = createOpenAISSEChunk(model, {}, "stop");
          await writeSSEEvent(writer, finalChunk);
          await writeSSEDone(writer);
        },
      });
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
