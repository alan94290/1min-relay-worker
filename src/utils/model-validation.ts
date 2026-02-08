/**
 * Shared model validation logic
 * Throws typed errors instead of returning error Responses
 */

import { Env, Message } from "../types";
import {
  parseAndValidateModel,
  processMessagesWithImageCheck,
} from "./message-processing";
import { WebSearchConfig } from "./model-parser";
import { ValidationError, ModelNotFoundError } from "./errors";
import { supportsVision } from "./model-capabilities";
import { ALL_ONE_MIN_AVAILABLE_MODELS } from "../constants";

export interface ValidatedModel {
  cleanModel: string;
  webSearchConfig?: WebSearchConfig;
  processedMessages: Message[];
}

/**
 * Validate model name and process messages in one step.
 * Throws ValidationError or ModelNotFoundError on failure.
 */
export function validateModelAndMessages(
  rawModel: string,
  messages: Message[],
  env: Env,
): ValidatedModel {
  // Parse model name and get web search configuration
  const parseResult = parseAndValidateModel(rawModel, env);
  if (parseResult.error) {
    throw new ValidationError(parseResult.error, "model", "model_not_found");
  }

  const { cleanModel, webSearchConfig } = parseResult;

  // Validate that the clean model exists in our supported models
  if (!ALL_ONE_MIN_AVAILABLE_MODELS.includes(cleanModel)) {
    throw new ModelNotFoundError(cleanModel);
  }

  // Process messages and check for images in a single pass
  const { processedMessages, hasImages } =
    processMessagesWithImageCheck(messages);
  if (hasImages && !supportsVision(cleanModel)) {
    throw new ValidationError(
      `Model '${cleanModel}' does not support image inputs`,
      "model",
      "model_not_supported",
    );
  }

  return { cleanModel, webSearchConfig, processedMessages };
}
