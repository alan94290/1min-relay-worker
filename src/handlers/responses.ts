/**
 * Responses endpoint handler
 * Handles structured outputs and reasoning requests
 */

import { Env, ResponseRequest } from "../types";
import { OneMinApiService } from "../services";
import {
  createErrorResponse,
  createSuccessResponse,
  ModelParser,
  WebSearchConfig,
} from "../utils";
import {
  extractImageFromContent,
  isVisionSupportedModel,
} from "../utils/image";
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
    apiKey: string
  ): Promise<Response> {
    try {
      // Validate required fields - support both input and messages formats
      if (
        !requestBody.input &&
        (!requestBody.messages || !Array.isArray(requestBody.messages))
      ) {
        return createErrorResponse(
          'Either "input" field (string) or "messages" field (array) is required'
        );
      }

      // Convert input format to messages format if needed
      let messages: any[];
      if (requestBody.input) {
        // Simple input format - convert to messages
        messages = [
          {
            role: "user",
            content: requestBody.input,
          },
        ];
      } else {
        // Use provided messages
        messages = requestBody.messages!;
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
        return createErrorResponse(
          `The model '${cleanModel}' does not exist`,
          400,
          "invalid_request_error",
          "model_not_found"
        );
      }

      // Check for images and validate vision model support
      const hasImages = this.checkForImages(messages);
      if (hasImages && !isVisionSupportedModel(cleanModel)) {
        return createErrorResponse(
          `Model '${cleanModel}' does not support image inputs`,
          400,
          "invalid_request_error",
          "model_not_supported"
        );
      }

      // Process messages and extract images if any
      const processedMessages = this.processMessages(messages);

      // Handle the response request (responses API doesn't support streaming)
      return this.handleNonStreamingResponse(
        processedMessages,
        cleanModel,
        requestBody.temperature,
        requestBody.max_tokens,
        requestBody.response_format,
        requestBody.reasoning_effort,
        apiKey,
        webSearchConfig
      );
    } catch (error) {
      console.error("Response error:", error);
      return createErrorResponse("Internal server error", 500);
    }
  }

  private parseAndValidateModel(modelName: string): {
    cleanModel: string;
    webSearchConfig?: WebSearchConfig;
    error?: string;
  } {
    return ModelParser.parseAndGetConfig(modelName, this.env);
  }

  private checkForImages(messages: any[]): boolean {
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

  private processMessages(messages: any[]): any[] {
    return messages.map((message) => {
      // Handle vision inputs
      if (Array.isArray(message.content)) {
        const imageUrl = extractImageFromContent(message.content);
        if (imageUrl) {
          // Convert to format expected by 1min.ai API
          return {
            ...message,
            content: message.content.map((item: any) => {
              if (item.type === "image_url") {
                return {
                  type: "image_url",
                  image_url: { url: item.image_url.url },
                };
              }
              return item;
            }),
          };
        }
      }
      return message;
    });
  }

  private async handleNonStreamingResponse(
    messages: any[],
    model: string,
    temperature?: number,
    maxTokens?: number,
    responseFormat?: ResponseRequest["response_format"],
    reasoningEffort?: ResponseRequest["reasoning_effort"],
    apiKey?: string,
    webSearchConfig?: WebSearchConfig
  ): Promise<Response> {
    try {
      // Build the request body with enhanced prompting for structured responses
      const enhancedMessages = this.enhanceMessagesForStructuredResponse(
        messages,
        responseFormat,
        reasoningEffort
      );

      const requestBody = await this.apiService.buildChatRequestBody(
        enhancedMessages,
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
      const data = await response.json();

      // Transform response to OpenAI Responses format
      const openAIResponse = this.transformToResponsesFormat(
        data,
        model,
        responseFormat
      );
      return createSuccessResponse(openAIResponse);
    } catch (error) {
      console.error("Non-streaming response error:", error);
      return createErrorResponse("Failed to process response", 500);
    }
  }

  private enhanceMessagesForStructuredResponse(
    messages: any[],
    responseFormat?: ResponseRequest["response_format"],
    reasoningEffort?: ResponseRequest["reasoning_effort"]
  ): any[] {
    const enhancedMessages = [...messages];

    // Add system message for structured output if needed
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

      // Add reasoning effort instruction
      if (reasoningEffort) {
        const effortInstructions = {
          low: "Provide a direct and concise response.",
          medium:
            "Think through the problem step by step and provide a well-reasoned response.",
          high: "Carefully analyze all aspects of the problem, consider multiple perspectives, and provide a thoroughly reasoned response with detailed explanations.",
        };
        structurePrompt += ` ${effortInstructions[reasoningEffort]}`;
      }

      // Insert or update system message
      const systemMessageIndex = enhancedMessages.findIndex(
        (msg) => msg.role === "system"
      );
      if (systemMessageIndex >= 0) {
        enhancedMessages[systemMessageIndex].content +=
          `\n\n${structurePrompt}`;
      } else {
        enhancedMessages.unshift({
          role: "system",
          content: structurePrompt,
        });
      }
    }

    return enhancedMessages;
  }

  private transformToResponsesFormat(
    data: any,
    model: string,
    responseFormat?: ResponseRequest["response_format"]
  ): any {
    const content =
      data.aiRecord?.aiRecordDetail?.resultObject?.[0] ||
      data.content ||
      "No response generated";

    // Try to parse JSON if response format is JSON
    let parsedContent = content;
    if (
      responseFormat?.type === "json_object" ||
      responseFormat?.type === "json_schema"
    ) {
      try {
        parsedContent = JSON.parse(content);
      } catch (error) {
        // If parsing fails, keep as string but log the error
        console.warn("Failed to parse response as JSON:", error);
      }
    }

    return {
      id: `resp-${crypto.randomUUID()}`,
      object: "response",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content:
              typeof parsedContent === "string"
                ? parsedContent
                : JSON.stringify(parsedContent),
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
