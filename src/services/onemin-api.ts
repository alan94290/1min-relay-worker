/**
 * 1min.ai API service layer
 */

import { WHISPER_MODEL_IDS } from "../constants/config";
import type {
  Env,
  Message,
  OneMinChatResponse,
  OneMinImageResponse,
  OneMinPromptObject,
  OneMinRequestBody,
} from "../types";
import { ApiError } from "../utils/errors";
import { processImageUrl, uploadImageToAsset } from "../utils/image";
import { extractTextFromMessageContent } from "../utils/message-processing";
import type { WebSearchConfig } from "../utils/model-parser";
import { isVisionModel } from "./model-registry";

// Helper function to format conversation for the API
// Converts message array to format expected by 1min.ai API
function formatConversationHistory(
  messages: Message[],
  newInput: string = "",
): string {
  let formattedHistory = "";

  for (const message of messages) {
    const role = message.role;
    const content = extractTextFromMessageContent(message.content);

    if (role === "system") {
      formattedHistory += `System: ${content}\n\n`;
    } else if (role === "user") {
      formattedHistory += `Human: ${content}\n\n`;
    } else if (role === "assistant") {
      formattedHistory += `Assistant: ${content}\n\n`;
    }
  }

  // Add the new input if provided
  if (newInput) {
    formattedHistory += `Human: ${newInput}\n\n`;
  }

  return formattedHistory;
}

export class OneMinApiService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async sendChatRequest(
    requestBody: OneMinRequestBody,
    isStreaming: boolean = false,
    apiKey?: string,
  ): Promise<Response> {
    const apiUrl = isStreaming
      ? this.env.ONE_MIN_CONVERSATION_API_STREAMING_URL
      : this.env.ONE_MIN_API_URL;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (apiKey) {
      headers["API-KEY"] = apiKey;
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Log the error body for debugging (truncated to avoid large log entries)
        const rawErrorBody = await response.text().catch(() => "(unreadable)");
        const errorBody = rawErrorBody.slice(0, 500);
        console.error(
          `1min.ai API error: ${response.status} ${response.statusText}`,
          {
            url: apiUrl,
            model: requestBody.model,
            errorBody,
          },
        );

        // If the error might be related to webSearch parameters, try graceful degradation
        if (response.status === 400 && requestBody.promptObject?.webSearch) {
          console.warn(
            "Attempting graceful degradation: removing webSearch parameters",
          );
          const fallbackRequestBody =
            this.createFallbackRequestBody(requestBody);

          const fallbackResponse = await fetch(apiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(fallbackRequestBody),
          });

          if (fallbackResponse.ok) {
            console.log("Graceful degradation successful");
            // Add header to indicate degradation occurred
            const responseHeaders = new Headers(fallbackResponse.headers);
            responseHeaders.set("X-WebSearch-Degraded", "true");

            return new Response(fallbackResponse.body, {
              status: fallbackResponse.status,
              statusText: fallbackResponse.statusText,
              headers: responseHeaders,
            });
          }
        }

        throw new Error(
          `1min.ai API error: ${response.status} ${response.statusText}`,
        );
      }

      return response;
    } catch (error) {
      console.error("Network error in sendChatRequest:", error);
      throw error;
    }
  }

  private createFallbackRequestBody(
    originalRequestBody: OneMinRequestBody,
  ): OneMinRequestBody {
    const { webSearch, numOfSite, maxWord, ...restPrompt } =
      originalRequestBody.promptObject;
    return {
      ...originalRequestBody,
      promptObject: { ...restPrompt, webSearch: false },
    };
  }

  async sendImageRequest(
    requestBody: OneMinRequestBody,
    apiKey?: string,
  ): Promise<OneMinImageResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add API key if provided
    if (apiKey) {
      headers["API-KEY"] = apiKey;
    }

    const response = await fetch(
      `${this.env.ONE_MIN_API_URL}?isStreaming=false`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("=== 1MIN.AI API ERROR RESPONSE ===", errorData);
      throw new Error(
        `1min.ai API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as OneMinImageResponse;
  }

  async buildChatRequestBody(
    messages: Message[],
    model: string,
    apiKey: string,
    _temperature?: number,
    _maxTokens?: number,
    webSearchConfig?: WebSearchConfig,
  ): Promise<OneMinRequestBody> {
    // Process images and check for vision model support
    const imagePaths: string[] = [];
    let hasImageRequests = false;
    let allImagesUploaded = true;

    // Only process images from the latest user message to avoid reprocessing
    const latestMessage =
      messages && messages.length > 0 ? messages[messages.length - 1] : null;

    if (latestMessage && Array.isArray(latestMessage.content)) {
      for (const item of latestMessage.content) {
        if (item.type === "image_url" && item.image_url?.url) {
          hasImageRequests = true;

          // Check if model supports vision inputs
          if (!(await isVisionModel(model, this.env))) {
            throw new Error(`Model '${model}' does not support image inputs`);
          }

          try {
            const imageData = await processImageUrl(item.image_url.url);
            const imagePath = await uploadImageToAsset(
              imageData,
              apiKey,
              this.env.ONE_MIN_ASSET_URL,
            );
            imagePaths.push(imagePath);
          } catch (error) {
            console.error("Error processing image:", error);
            allImagesUploaded = false;
            // Continue processing other images
          }
        }
      }
    }

    // Format messages for the API call
    const formattedHistory = formatConversationHistory(messages, "");

    // Only use CHAT_WITH_IMAGE if we have image requests AND all images were successfully uploaded
    if (hasImageRequests && allImagesUploaded && imagePaths.length > 0) {
      const promptObject: OneMinPromptObject = {
        prompt: formattedHistory,
        isMixed: false,
        imageList: imagePaths,
      };

      // Add web search parameters if enabled
      if (webSearchConfig) {
        promptObject.webSearch = webSearchConfig.webSearch;
        promptObject.numOfSite = webSearchConfig.numOfSite;
        promptObject.maxWord = webSearchConfig.maxWord;
      }

      const requestBody = {
        type: "CHAT_WITH_IMAGE",
        model: model,
        promptObject,
      };

      return requestBody;
    } else {
      const promptObject: OneMinPromptObject = {
        prompt: formattedHistory,
        isMixed: false,
        webSearch: webSearchConfig ? webSearchConfig.webSearch : false,
      };

      // Add web search parameters if enabled
      if (webSearchConfig?.webSearch) {
        promptObject.numOfSite = webSearchConfig.numOfSite;
        promptObject.maxWord = webSearchConfig.maxWord;
      }

      return {
        type: "CHAT_WITH_AI",
        model: model,
        promptObject,
      };
    }
  }

  buildImageRequestBody(
    prompt: string,
    model: string,
    n?: number,
    size?: string,
  ): OneMinRequestBody {
    return {
      type: "IMAGE_GENERATOR",
      model: model,
      promptObject: {
        prompt: prompt,
        n: n ?? 1,
        size: size ?? "1024x1024",
      },
    };
  }

  /**
   * Google Speech models use `language` in promptObject;
   * Whisper-1 uses `response_format` instead.
   */
  buildSpeechToTextRequestBody(
    audioUrl: string,
    model: string,
    language?: string,
    responseFormat?: string,
    prompt?: string,
    temperature?: number,
  ): OneMinRequestBody {
    const isWhisperModel = WHISPER_MODEL_IDS.has(model);

    const promptObject: OneMinPromptObject = {
      prompt: prompt ?? "",
      audioUrl,
    };

    if (isWhisperModel) {
      promptObject.response_format = responseFormat ?? "text";
      if (language) {
        promptObject.language = language;
      }
      if (temperature !== undefined) {
        promptObject.temperature = temperature;
      }
    } else {
      // Google Speech models use language instead of response_format/temperature
      if (language) {
        promptObject.language = language;
      }
    }

    return {
      type: "SPEECH_TO_TEXT",
      model,
      promptObject,
    };
  }

  buildAudioTranslatorRequestBody(
    audioUrl: string,
    model: string,
    responseFormat?: string,
    temperature?: number,
    prompt?: string,
  ): OneMinRequestBody {
    const promptObject: OneMinPromptObject = {
      prompt: prompt ?? "",
      audioUrl,
    };

    // Only Whisper models support response_format and temperature
    if (WHISPER_MODEL_IDS.has(model)) {
      promptObject.response_format = responseFormat ?? "text";
      if (temperature !== undefined) {
        promptObject.temperature = temperature;
      }
    }

    return {
      type: "AUDIO_TRANSLATOR",
      model,
      promptObject,
    };
  }

  async sendAudioRequest(
    requestBody: OneMinRequestBody,
    apiKey?: string,
  ): Promise<OneMinChatResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["API-KEY"] = apiKey;
    }

    const response = await fetch(
      `${this.env.ONE_MIN_API_URL}?isStreaming=false`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const rawError = await response.text().catch(() => "(unreadable)");
      console.error("=== 1MIN.AI AUDIO API ERROR ===", rawError.slice(0, 500));
      throw new ApiError(
        `1min.ai API error: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    return (await response.json()) as OneMinChatResponse;
  }
}
