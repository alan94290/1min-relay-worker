/**
 * Anthropic Messages API endpoint handler
 * Handles requests in Anthropic SDK format and returns Anthropic-compatible responses
 */

import {
  Env,
  Message,
  OneMinChatResponse,
  AnthropicMessageRequest,
  AnthropicMessageResponse,
  AnthropicTextContent,
  AnthropicContentBlock,
  AnthropicMessage,
} from "../types";
import { OneMinApiService } from "../services";
import {
  createErrorResponse,
  WebSearchConfig,
  processMessagesWithImageCheck,
  parseAndValidateModel,
  extractAllMessageText,
  calculateTokens,
} from "../utils";
import {
  CORS_HEADERS,
  ALL_ONE_MIN_AVAILABLE_MODELS,
  DEFAULT_MODEL,
} from "../constants";
import { createSSEResponse, writeSSEEventWithType } from "../utils/sse";
import { supportsVision } from "../utils/model-capabilities";
import { SimpleUTF8Decoder } from "../utils/utf8-decoder";

export class MessagesHandler {
  private env: Env;
  private apiService: OneMinApiService;

  constructor(env: Env) {
    this.env = env;
    this.apiService = new OneMinApiService(env);
  }

  async handleMessages(
    requestBody: AnthropicMessageRequest,
    apiKey: string,
  ): Promise<Response> {
    try {
      // Validate required fields
      if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
        return this.createAnthropicError(
          "messages: Field required",
          "invalid_request_error",
          400,
        );
      }

      if (!requestBody.max_tokens || requestBody.max_tokens <= 0) {
        return this.createAnthropicError(
          "max_tokens: Field required",
          "invalid_request_error",
          400,
        );
      }

      // Set default model if not provided
      const rawModel = requestBody.model || DEFAULT_MODEL;

      // Parse model name and get web search configuration
      const parseResult = parseAndValidateModel(rawModel, this.env);
      if (parseResult.error) {
        return this.createAnthropicError(
          parseResult.error,
          "invalid_request_error",
          400,
        );
      }

      const { cleanModel, webSearchConfig } = parseResult;

      // Validate model
      if (!ALL_ONE_MIN_AVAILABLE_MODELS.includes(cleanModel)) {
        return this.createAnthropicError(
          `model: ${cleanModel} is not available`,
          "not_found_error",
          404,
        );
      }

      // Convert Anthropic messages to internal format
      const internalMessages = this.convertToInternalMessages(
        requestBody.messages,
        requestBody.system,
      );

      // Process messages and check for images in a single pass
      const { processedMessages, hasImages } =
        processMessagesWithImageCheck(internalMessages);
      if (hasImages && !supportsVision(cleanModel)) {
        return this.createAnthropicError(
          `Model '${cleanModel}' does not support image inputs`,
          "invalid_request_error",
          400,
        );
      }

      // Handle streaming vs non-streaming
      if (requestBody.stream) {
        return this.handleStreamingMessage(
          processedMessages,
          cleanModel,
          requestBody,
          apiKey,
          webSearchConfig,
        );
      } else {
        return this.handleNonStreamingMessage(
          processedMessages,
          cleanModel,
          requestBody,
          apiKey,
          webSearchConfig,
        );
      }
    } catch (error) {
      console.error("Anthropic messages error:", error);
      return this.createAnthropicError(
        error instanceof Error ? error.message : "Internal server error",
        "api_error",
        500,
      );
    }
  }

  private convertToInternalMessages(
    messages: AnthropicMessage[],
    system?: string | AnthropicTextContent[],
  ): Message[] {
    const internalMessages: Message[] = [];

    // Add system message if present (Anthropic puts system at top-level)
    if (system) {
      const systemText =
        typeof system === "string"
          ? system
          : system.map((block) => block.text).join("\n");
      internalMessages.push({
        role: "system",
        content: systemText,
      });
    }

    // Convert each Anthropic message
    for (const msg of messages) {
      const content = this.extractAnthropicContent(msg.content);
      internalMessages.push({
        role: msg.role,
        content,
      });
    }

    return internalMessages;
  }

  private extractAnthropicContent(
    content: string | AnthropicContentBlock[],
  ): string {
    if (typeof content === "string") {
      return content;
    }

    // Check for unsupported image blocks
    const hasImages = content.some((block) => block.type === "image");
    if (hasImages) {
      throw new Error(
        "Image content blocks in Anthropic format are not yet supported. Use the OpenAI Chat Completions API (/v1/chat/completions) for vision requests.",
      );
    }

    // Extract text from content blocks
    const textParts: string[] = [];
    for (const block of content) {
      if (block.type === "text") {
        textParts.push(block.text);
      } else if (block.type === "tool_result") {
        const resultText =
          typeof block.content === "string"
            ? block.content
            : block.content.map((b) => b.text).join("\n");
        textParts.push(resultText);
      }
    }
    return textParts.join("\n");
  }

  private async handleNonStreamingMessage(
    messages: Message[],
    model: string,
    originalRequest: AnthropicMessageRequest,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    try {
      const requestBody = await this.apiService.buildChatRequestBody(
        messages,
        model,
        apiKey,
        originalRequest.temperature,
        originalRequest.max_tokens,
        webSearchConfig,
      );

      const response = await this.apiService.sendChatRequest(
        requestBody,
        false,
        apiKey,
      );
      const data = (await response.json()) as OneMinChatResponse;

      // Transform to Anthropic format
      const anthropicResponse = this.transformToAnthropicFormat(
        data,
        model,
        messages,
      );

      return new Response(JSON.stringify(anthropicResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    } catch (error) {
      console.error("Non-streaming message error:", error);
      return this.createAnthropicError(
        "Failed to process message",
        "api_error",
        500,
      );
    }
  }

  private async handleStreamingMessage(
    messages: Message[],
    model: string,
    originalRequest: AnthropicMessageRequest,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    try {
      const requestBody = await this.apiService.buildChatRequestBody(
        messages,
        model,
        apiKey,
        originalRequest.temperature,
        originalRequest.max_tokens,
        webSearchConfig,
      );

      const response = await this.apiService.sendChatRequest(
        requestBody,
        true,
        apiKey,
      );

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      const reader = response.body?.getReader();
      if (!reader) {
        await writer.close();
        return createSSEResponse(readable);
      }

      const messageId = `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

      // Start streaming process
      (async () => {
        try {
          const utf8Decoder = new SimpleUTF8Decoder();
          const contentChunks: string[] = [];

          // Send message_start event
          const messageStart: AnthropicMessageResponse = {
            id: messageId,
            type: "message",
            role: "assistant",
            content: [],
            model,
            stop_reason: null,
            stop_sequence: null,
            usage: {
              input_tokens: this.estimateInputTokens(messages),
              output_tokens: 0,
            },
          };
          await writeSSEEventWithType(writer, "message_start", {
            type: "message_start",
            message: messageStart,
          });

          // Send content_block_start
          await writeSSEEventWithType(writer, "content_block_start", {
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          });

          // Send ping
          await writeSSEEventWithType(writer, "ping", { type: "ping" });

          // Stream content deltas
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = utf8Decoder.decode(value, done);
            if (chunk) {
              contentChunks.push(chunk);
              await writeSSEEventWithType(writer, "content_block_delta", {
                type: "content_block_delta",
                index: 0,
                delta: { type: "text_delta", text: chunk },
              });
            }
          }

          // Send content_block_stop
          await writeSSEEventWithType(writer, "content_block_stop", {
            type: "content_block_stop",
            index: 0,
          });

          // Send message_delta with stop reason and usage
          const accumulatedContent = contentChunks.join("");
          const outputTokens = calculateTokens(accumulatedContent, model);
          await writeSSEEventWithType(writer, "message_delta", {
            type: "message_delta",
            delta: { stop_reason: "end_turn" },
            usage: { output_tokens: outputTokens },
          });

          // Send message_stop
          await writeSSEEventWithType(writer, "message_stop", {
            type: "message_stop",
          });

          await writer.close();
        } catch (error) {
          console.error("Anthropic streaming error:", error);
          await writer.abort(error);
        }
      })();

      return createSSEResponse(readable);
    } catch (error) {
      console.error("Streaming message error:", error);
      return this.createAnthropicError(
        "Failed to process streaming message",
        "api_error",
        500,
      );
    }
  }

  private transformToAnthropicFormat(
    data: OneMinChatResponse,
    model: string,
    messages: Message[],
  ): AnthropicMessageResponse {
    const content =
      data.aiRecord?.aiRecordDetail?.resultObject?.[0] ||
      data.content ||
      "No response generated";

    const inputTokens =
      data.usage?.prompt_tokens || this.estimateInputTokens(messages);
    const outputTokens =
      data.usage?.completion_tokens || calculateTokens(content, model);

    return {
      id: `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: content }],
      model,
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    };
  }

  private estimateInputTokens(messages: Message[]): number {
    return calculateTokens(extractAllMessageText(messages));
  }

  private createAnthropicError(
    message: string,
    type: string,
    status: number,
  ): Response {
    return new Response(
      JSON.stringify({
        type: "error",
        error: { type, message },
      }),
      {
        status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
}
