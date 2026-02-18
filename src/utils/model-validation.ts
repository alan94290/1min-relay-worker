/**
 * Shared model validation logic
 * Throws typed errors instead of returning error Responses
 */

import { getModelData } from "../services/model-registry";
import type { Env, Message } from "../types";
import { ModelNotFoundError, ValidationError } from "./errors";
import { processMessagesWithImageCheck } from "./message-processing";
import { parseAndGetConfig, type WebSearchConfig } from "./model-parser";

export interface ValidatedModel {
  cleanModel: string;
  webSearchConfig?: WebSearchConfig;
  processedMessages: Message[];
}

/**
 * Validate model name and process messages in one step.
 * Throws ValidationError or ModelNotFoundError on failure.
 */
export async function validateModelAndMessages(
  rawModel: string,
  messages: Message[],
  env: Env,
): Promise<ValidatedModel> {
  // Parse model name and get web search configuration
  const parseResult = parseAndGetConfig(rawModel, env);
  if (parseResult.error) {
    throw new ValidationError(parseResult.error, "model", "model_not_found");
  }

  const { cleanModel, webSearchConfig } = parseResult;

  // Fetch model data once for all checks
  const modelData = await getModelData(env);

  // Validate that the clean model exists
  const isValid =
    modelData.chatModelIds.includes(cleanModel) ||
    modelData.imageModelIds.includes(cleanModel);
  if (!isValid) {
    throw new ModelNotFoundError(cleanModel);
  }

  // Process messages and check for images in a single pass
  const { processedMessages, hasImages } =
    processMessagesWithImageCheck(messages);
  if (hasImages && !modelData.visionModelIds.includes(cleanModel)) {
    throw new ValidationError(
      `Model '${cleanModel}' does not support image inputs`,
      "model",
      "model_not_supported",
    );
  }

  return { cleanModel, webSearchConfig, processedMessages };
}
