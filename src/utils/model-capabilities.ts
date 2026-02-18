/**
 * Model capabilities checking utilities
 * Centralized place for checking model capabilities
 */

import {
  CODE_INTERPRETER_SUPPORTED_MODELS,
  IMAGE_GENERATION_MODELS,
  RETRIEVAL_SUPPORTED_MODELS,
  SPEECH_TO_TEXT_MODELS,
  TEXT_TO_SPEECH_MODELS,
  VISION_SUPPORTED_MODELS,
} from "../constants";
import { ValidationError } from "./errors";

/**
 * Check if a model supports vision/image inputs
 */
export function supportsVision(model: string): boolean {
  return VISION_SUPPORTED_MODELS.includes(model);
}

/**
 * Check if a model supports code interpreter
 */
export function supportsCodeInterpreter(model: string): boolean {
  return CODE_INTERPRETER_SUPPORTED_MODELS.includes(model);
}

/**
 * Check if a model supports web search/retrieval
 */
export function supportsRetrieval(model: string): boolean {
  return RETRIEVAL_SUPPORTED_MODELS.includes(model);
}

/**
 * Check if a model supports image generation
 */
export function supportsImageGeneration(model: string): boolean {
  return IMAGE_GENERATION_MODELS.includes(model);
}

/**
 * Check if a model supports text-to-speech
 */
export function supportsTextToSpeech(model: string): boolean {
  return TEXT_TO_SPEECH_MODELS.includes(model);
}

/**
 * Check if a model supports speech-to-text
 */
export function supportsSpeechToText(model: string): boolean {
  return SPEECH_TO_TEXT_MODELS.includes(model);
}

/**
 * Get all capabilities for a model
 */
export function getModelCapabilities(model: string) {
  return {
    vision: supportsVision(model),
    codeInterpreter: supportsCodeInterpreter(model),
    retrieval: supportsRetrieval(model),
    imageGeneration: supportsImageGeneration(model),
    textToSpeech: supportsTextToSpeech(model),
    speechToText: supportsSpeechToText(model),
  };
}

/**
 * Validate model requirements
 * Throws error if model doesn't support required capabilities
 */
export function validateModelCapabilities(
  model: string,
  requirements: {
    vision?: boolean;
    codeInterpreter?: boolean;
    retrieval?: boolean;
  },
): void {
  const capabilities = getModelCapabilities(model);

  if (requirements.vision && !capabilities.vision) {
    throw new ValidationError(
      `Model '${model}' does not support image inputs`,
      "model",
      "model_not_supported",
    );
  }

  if (requirements.codeInterpreter && !capabilities.codeInterpreter) {
    throw new ValidationError(
      `Model '${model}' does not support code interpreter`,
      "model",
      "model_not_supported",
    );
  }

  if (requirements.retrieval && !capabilities.retrieval) {
    throw new ValidationError(
      `Model '${model}' does not support web search/retrieval`,
      "model",
      "model_not_supported",
    );
  }
}
