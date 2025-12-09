/**
 * Chat completions endpoint handler
 */

import {
  Env,
  Message,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  OneMinResponse,
  OneMinStreamChunk,
  ChatCompletionRequestWithTools,
} from "../types";
import { OneMinApiService } from "../services";
import {
  createErrorResponse,
  createSuccessResponse,
  createErrorResponseFromError,
  WebSearchConfig,
  ModelNotFoundError,
  convertToolsToSystemPrompt,
  injectFunctionSystemPrompt,
  parseFunctionCallsFromResponse,
  hasFunctionCallingParams,
  transformResponseWithFunctionCalls,
  checkForImages,
  processMessages,
  parseAndValidateModel,
} from "../utils";
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
      const requestBody: ChatCompletionRequestWithTools = await request.json();
      return await this.handleChatCompletionsWithBody(requestBody, "");
    } catch (error) {
      console.error("Chat completion error:", error);
      return createErrorResponseFromError(error);
    }
  }

  async handleChatCompletionsWithBody(
    requestBody: ChatCompletionRequestWithTools,
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
      const parseResult = parseAndValidateModel(rawModel, this.env);
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
      const hasImages = checkForImages(requestBody.messages as Message[]);
      if (hasImages && !supportsVision(cleanModel)) {
        return createErrorResponse(
          `Model '${cleanModel}' does not support image inputs`,
          400,
          "invalid_request_error",
          "model_not_supported"
        );
      }

      // Process messages and extract images if any
      let processedMessages = processMessages(
        requestBody.messages as Message[]
      );

      // Handle function calling by injecting system prompt
      if (hasFunctionCallingParams(requestBody)) {
        const functionSystemPrompt = convertToolsToSystemPrompt(
          requestBody.tools,
          requestBody.functions,
          requestBody.tool_choice,
          requestBody.function_call
        );
        processedMessages = injectFunctionSystemPrompt(
          processedMessages,
          functionSystemPrompt
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
          hasFunctionCallingParams(requestBody)
        );
      } else {
        return this.handleNonStreamingChat(
          processedMessages,
          cleanModel,
          requestBody.temperature,
          requestBody.max_tokens,
          apiKey,
          webSearchConfig,
          hasFunctionCallingParams(requestBody)
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
    hasFunctionCalling: boolean = false
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
      let openAIResponse = this.transformToOpenAIFormat(data, model);

      // Parse function calls if function calling is enabled
      if (hasFunctionCalling && openAIResponse.choices && openAIResponse.choices.length > 0) {
        const choice = openAIResponse.choices[0];
        if (choice && choice.message) {
          const content = choice.message.content || "";
          const { cleanContent, toolCalls, functionCall } = parseFunctionCallsFromResponse(content);

          if (toolCalls?.length || functionCall) {
            choice.message.content = cleanContent;
            openAIResponse = transformResponseWithFunctionCalls(
              openAIResponse,
              toolCalls,
              functionCall
            );
          }
        }
      }

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
    hasFunctionCalling: boolean = false
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
          // Use UTF-8 safe decoder to handle multi-byte characters
          const utf8Decoder = new SimpleUTF8Decoder();
          const encoder = new TextEncoder();
          let accumulatedContent = "";
          let functionCallsSent = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode with UTF-8 safety (handles incomplete sequences)
            const chunk = utf8Decoder.decode(value, done);

            // Accumulate content for function call parsing
            if (hasFunctionCalling) {
              accumulatedContent += chunk;
            }

            // Check for function calls in accumulated content
            if (hasFunctionCalling && !functionCallsSent) {
              const { cleanContent, toolCalls, functionCall } = parseFunctionCallsFromResponse(accumulatedContent);

              if (toolCalls?.length || functionCall) {
                // Send function call chunk
                const functionChunk: ChatCompletionStreamChunk = {
                  id: `chatcmpl-${crypto.randomUUID()}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: model,
                  choices: [
                    {
                      index: 0,
                      delta: toolCalls?.length ? { tool_calls: toolCalls } : { function_call: functionCall },
                      finish_reason: null as string | null,
                    },
                  ],
                };
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify(functionChunk)}\n\n`)
                );
                functionCallsSent = true;

                // Send clean content if any
                if (cleanContent) {
                  const contentChunk: ChatCompletionStreamChunk = {
                    id: `chatcmpl-${crypto.randomUUID()}`,
                    object: "chat.completion.chunk",
                    created: Math.floor(Date.now() / 1000),
                    model: model,
                    choices: [
                      {
                        index: 0,
                        delta: { content: cleanContent },
                        finish_reason: null as string | null,
                      },
                    ],
                  };
                  await writer.write(
                    encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`)
                  );
                }
                continue;
              }
            }

            // Send regular content chunk if no function calls
            if (!hasFunctionCalling || !functionCallsSent) {
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
          }

          // Parse final function calls if not yet sent
          if (hasFunctionCalling && !functionCallsSent && accumulatedContent) {
            const { cleanContent, toolCalls, functionCall } = parseFunctionCallsFromResponse(accumulatedContent);

            if (toolCalls?.length || functionCall) {
              // Send function call chunk
              const functionChunk: ChatCompletionStreamChunk = {
                id: `chatcmpl-${crypto.randomUUID()}`,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: model,
                choices: [
                  {
                    index: 0,
                    delta: toolCalls?.length ? { tool_calls: toolCalls } : { function_call: functionCall },
                    finish_reason: null as string | null,
                  },
                ],
              };
              await writer.write(
                encoder.encode(`data: ${JSON.stringify(functionChunk)}\n\n`)
              );

              // Send clean content if any
              if (cleanContent) {
                const contentChunk: ChatCompletionStreamChunk = {
                  id: `chatcmpl-${crypto.randomUUID()}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: model,
                  choices: [
                    {
                      index: 0,
                      delta: { content: cleanContent },
                      finish_reason: null as string | null,
                    },
                  ],
                };
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`)
                );
              }
            }
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
                finish_reason: hasFunctionCalling && functionCallsSent ? "tool_calls" : "stop",
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
