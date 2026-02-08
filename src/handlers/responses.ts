/**
 * Responses endpoint handler
 * Handles structured outputs and reasoning requests
 * Uses OpenAI Responses API format with output[] instead of choices[]
 */

import {
  Env,
  ResponseRequest,
  ResponseInputItem,
  Message,
  OneMinChatResponse,
  ResponsesAPIResponse,
  ResponsesOutputMessage,
  ResponseFormat,
} from "../types";
import { OneMinApiService } from "../services";
import {
  createErrorResponse,
  createSuccessResponse,
  WebSearchConfig,
  processMessagesWithImageCheck,
  parseAndValidateModel,
  calculateTokens,
  extractAllMessageText,
} from "../utils";
import {
  createSSEResponse,
  writeSSEEventWithType,
  writeSSEDone,
} from "../utils/sse";
import { supportsVision } from "../utils/model-capabilities";
import { SimpleUTF8Decoder } from "../utils/utf8-decoder";
import { ALL_ONE_MIN_AVAILABLE_MODELS, DEFAULT_MODEL } from "../constants";

export class ResponseHandler {
  private env: Env;
  private apiService: OneMinApiService;

  constructor(env: Env) {
    this.env = env;
    this.apiService = new OneMinApiService(env);
  }

  async handleResponses(request: Request): Promise<Response> {
    try {
      const requestBody: ResponseRequest = await request.json();

      // Extract API key from Authorization header
      const authHeader = request.headers.get("Authorization");
      const apiKey = authHeader?.replace("Bearer ", "") || "";

      return await this.handleResponsesWithBody(requestBody, apiKey);
    } catch (error) {
      console.error("Response error:", error);
      return createErrorResponse("Internal server error", 500);
    }
  }

  async handleResponsesWithBody(
    requestBody: ResponseRequest,
    apiKey: string,
  ): Promise<Response> {
    try {
      // Validate required fields - support both input and messages formats
      if (
        !requestBody.input &&
        (!requestBody.messages || !Array.isArray(requestBody.messages))
      ) {
        return createErrorResponse(
          'Either "input" field (string or array) or "messages" field (array) is required',
        );
      }

      // Convert input format to messages format
      let messages: Message[];
      if (requestBody.input) {
        messages = this.convertInputToMessages(
          requestBody.input,
          requestBody.instructions,
        );
      } else {
        messages = requestBody.messages as Message[];
        // Add instructions as system message if provided
        if (requestBody.instructions) {
          messages = [
            { role: "system", content: requestBody.instructions },
            ...messages,
          ];
        }
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
        return createErrorResponse(
          `The model '${cleanModel}' does not exist`,
          400,
          "invalid_request_error",
          "model_not_found",
        );
      }

      // Process messages and check for images in a single pass
      const { processedMessages, hasImages } =
        processMessagesWithImageCheck(messages);
      if (hasImages && !supportsVision(cleanModel)) {
        return createErrorResponse(
          `Model '${cleanModel}' does not support image inputs`,
          400,
          "invalid_request_error",
          "model_not_supported",
        );
      }

      if (requestBody.stream) {
        return this.handleStreamingResponse(
          processedMessages,
          cleanModel,
          requestBody.temperature,
          requestBody.max_tokens,
          requestBody.response_format,
          requestBody.reasoning_effort,
          apiKey,
          webSearchConfig,
        );
      }

      return this.handleNonStreamingResponse(
        processedMessages,
        cleanModel,
        requestBody.temperature,
        requestBody.max_tokens,
        requestBody.response_format,
        requestBody.reasoning_effort,
        apiKey,
        webSearchConfig,
      );
    } catch (error) {
      console.error("Response error:", error);
      return createErrorResponse("Internal server error", 500);
    }
  }

  private convertInputToMessages(
    input: string | ResponseInputItem[],
    instructions?: string,
  ): Message[] {
    const messages: Message[] = [];

    // Add instructions as system message
    if (instructions) {
      messages.push({ role: "system", content: instructions });
    }

    if (typeof input === "string") {
      messages.push({ role: "user", content: input });
    } else {
      // Array of input items
      for (const item of input) {
        if (item.type === "message") {
          const content =
            typeof item.content === "string"
              ? item.content
              : item.content
                  .filter((c) => c.type === "text" && c.text)
                  .map((c) => c.text!)
                  .join("\n");
          messages.push({ role: item.role, content });
        }
      }
    }

    return messages;
  }

  private async handleNonStreamingResponse(
    messages: Message[],
    model: string,
    temperature?: number,
    maxTokens?: number,
    responseFormat?: ResponseFormat,
    reasoningEffort?: ResponseRequest["reasoning_effort"],
    apiKey?: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    try {
      const enhancedMessages = this.enhanceMessagesForStructuredResponse(
        messages,
        responseFormat,
        reasoningEffort,
      );

      const requestBody = await this.apiService.buildChatRequestBody(
        enhancedMessages,
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

      const responsesAPIResponse = this.transformToResponsesFormat(
        data,
        model,
        responseFormat,
      );
      return createSuccessResponse(responsesAPIResponse);
    } catch (error) {
      console.error("Non-streaming response error:", error);
      return createErrorResponse("Failed to process response", 500);
    }
  }

  private async handleStreamingResponse(
    messages: Message[],
    model: string,
    temperature?: number,
    maxTokens?: number,
    responseFormat?: ResponseFormat,
    reasoningEffort?: ResponseRequest["reasoning_effort"],
    apiKey?: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    try {
      const enhancedMessages = this.enhanceMessagesForStructuredResponse(
        messages,
        responseFormat,
        reasoningEffort,
      );

      const requestBody = await this.apiService.buildChatRequestBody(
        enhancedMessages,
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

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      const reader = response.body?.getReader();
      if (!reader) {
        await writer.close();
        return createSSEResponse(readable);
      }

      const responseId = `resp-${crypto.randomUUID()}`;
      const messageId = `msg-${crypto.randomUUID()}`;

      (async () => {
        try {
          const utf8Decoder = new SimpleUTF8Decoder();
          const contentChunks: string[] = [];

          // Send response.created
          const initialResponse: ResponsesAPIResponse = {
            id: responseId,
            object: "response",
            created_at: Math.floor(Date.now() / 1000),
            model,
            output: [],
            status: "in_progress",
            usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
          };
          await writeSSEEventWithType(writer, "response.created", {
            type: "response.created",
            response: initialResponse,
          });

          // Send output_item.added
          const outputItem: ResponsesOutputMessage = {
            type: "message",
            id: messageId,
            role: "assistant",
            content: [{ type: "output_text", text: "" }],
            status: "in_progress",
          };
          await writeSSEEventWithType(writer, "response.output_item.added", {
            type: "response.output_item.added",
            output_index: 0,
            item: outputItem,
          });

          // Send content_part.added
          await writeSSEEventWithType(writer, "response.content_part.added", {
            type: "response.content_part.added",
            output_index: 0,
            content_index: 0,
            part: { type: "output_text", text: "" },
          });

          // Stream content deltas
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = utf8Decoder.decode(value, done);
            if (chunk) {
              contentChunks.push(chunk);
              await writeSSEEventWithType(
                writer,
                "response.output_text.delta",
                {
                  type: "response.output_text.delta",
                  output_index: 0,
                  content_index: 0,
                  delta: chunk,
                },
              );
            }
          }

          const accumulatedContent = contentChunks.join("");

          // Send text done
          await writeSSEEventWithType(writer, "response.output_text.done", {
            type: "response.output_text.done",
            output_index: 0,
            content_index: 0,
            text: accumulatedContent,
          });

          // Send content_part.done
          await writeSSEEventWithType(writer, "response.content_part.done", {
            type: "response.content_part.done",
            output_index: 0,
            content_index: 0,
            part: { type: "output_text", text: accumulatedContent },
          });

          // Send output_item.done
          const completedItem: ResponsesOutputMessage = {
            type: "message",
            id: messageId,
            role: "assistant",
            content: [{ type: "output_text", text: accumulatedContent }],
            status: "completed",
          };
          await writeSSEEventWithType(writer, "response.output_item.done", {
            type: "response.output_item.done",
            output_index: 0,
            item: completedItem,
          });

          // Send response.done
          const outputTokens = calculateTokens(accumulatedContent, model);
          const inputTokens = this.estimateInputTokens(messages);
          const finalResponse: ResponsesAPIResponse = {
            id: responseId,
            object: "response",
            created_at: Math.floor(Date.now() / 1000),
            model,
            output: [completedItem],
            status: "completed",
            usage: {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              total_tokens: inputTokens + outputTokens,
            },
          };
          await writeSSEEventWithType(writer, "response.done", {
            type: "response.done",
            response: finalResponse,
          });

          await writeSSEDone(writer);
          await writer.close();
        } catch (error) {
          console.error("Responses streaming error:", error);
          await writer.abort(error);
        }
      })();

      return createSSEResponse(readable);
    } catch (error) {
      console.error("Streaming response error:", error);
      return createErrorResponse("Failed to process streaming response", 500);
    }
  }

  private enhanceMessagesForStructuredResponse(
    messages: Message[],
    responseFormat?: ResponseFormat,
    reasoningEffort?: ResponseRequest["reasoning_effort"],
  ): Message[] {
    const enhancedMessages = [...messages];

    if (responseFormat) {
      let structurePrompt = "";

      switch (responseFormat.type) {
        case "json_object":
          structurePrompt =
            "Please respond with a valid JSON object only. Do not include any text outside the JSON structure.";
          break;
        case "json_schema":
          if (responseFormat.json_schema) {
            structurePrompt = `Please respond with a valid JSON object that strictly follows this schema: ${JSON.stringify(responseFormat.json_schema.schema)}. The response should be named "${responseFormat.json_schema.name}". ${responseFormat.json_schema.description || ""}`;
          }
          break;
        case "text":
        default:
          structurePrompt =
            "Please provide a clear and structured text response.";
          break;
      }

      if (reasoningEffort) {
        const effortInstructions: Record<string, string> = {
          low: "Provide a direct and concise response.",
          medium:
            "Think through the problem step by step and provide a well-reasoned response.",
          high: "Carefully analyze all aspects of the problem, consider multiple perspectives, and provide a thoroughly reasoned response with detailed explanations.",
        };
        structurePrompt += ` ${effortInstructions[reasoningEffort]}`;
      }

      const systemMessageIndex = enhancedMessages.findIndex(
        (msg) => msg.role === "system",
      );
      if (systemMessageIndex >= 0) {
        const existing = enhancedMessages[systemMessageIndex]!;
        enhancedMessages[systemMessageIndex] = {
          role: existing.role,
          content:
            typeof existing.content === "string"
              ? `${existing.content}\n\n${structurePrompt}`
              : existing.content,
        };
      } else {
        enhancedMessages.unshift({
          role: "system",
          content: structurePrompt,
        });
      }
    }

    return enhancedMessages;
  }

  private estimateInputTokens(messages: Message[]): number {
    return calculateTokens(extractAllMessageText(messages));
  }

  private transformToResponsesFormat(
    data: OneMinChatResponse,
    model: string,
    responseFormat?: ResponseFormat,
  ): ResponsesAPIResponse {
    let content =
      data.aiRecord?.aiRecordDetail?.resultObject?.[0] ||
      data.content ||
      "No response generated";

    // Try to parse JSON if response format is JSON
    if (
      responseFormat?.type === "json_object" ||
      responseFormat?.type === "json_schema"
    ) {
      try {
        const parsed = JSON.parse(content);
        content = JSON.stringify(parsed);
      } catch {
        // If parsing fails, keep as string
        console.warn("Failed to parse response as JSON");
      }
    }

    const messageId = `msg-${crypto.randomUUID()}`;

    return {
      id: `resp-${crypto.randomUUID()}`,
      object: "response",
      created_at: Math.floor(Date.now() / 1000),
      model,
      output: [
        {
          type: "message",
          id: messageId,
          role: "assistant",
          content: [{ type: "output_text", text: content }],
          status: "completed",
        },
      ],
      status: "completed",
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  }
}
