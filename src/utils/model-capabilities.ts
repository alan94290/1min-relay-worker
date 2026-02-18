/**
 * Model capabilities checking utilities
 * Centralized place for checking model capabilities via the model registry
 */

import { getModelData } from "../services/model-registry";
import type { Env } from "../types";
import { ValidationError } from "./errors";

/**
 * Check if a model supports vision/image inputs
 */
export async function supportsVision(
  model: string,
  env: Env,
): Promise<boolean> {
  const data = await getModelData(env);
  return data.visionModelIds.includes(model);
}

/**
 * Check if a model supports code interpreter
 */
export async function supportsCodeInterpreter(
  model: string,
  env: Env,
): Promise<boolean> {
  const data = await getModelData(env);
  return data.codeInterpreterModelIds.includes(model);
}

/**
 * Check if a model supports image generation
 */
export async function supportsImageGeneration(
  model: string,
  env: Env,
): Promise<boolean> {
  const data = await getModelData(env);
  return data.imageModelIds.includes(model);
}

/**
 * Get all capabilities for a model
 */
export async function getModelCapabilities(
  model: string,
  env: Env,
): Promise<{
  vision: boolean;
  codeInterpreter: boolean;
  retrieval: boolean;
  imageGeneration: boolean;
}> {
  const data = await getModelData(env);
  return {
    vision: data.visionModelIds.includes(model),
    codeInterpreter: data.codeInterpreterModelIds.includes(model),
    retrieval: data.chatModelIds.includes(model),
    imageGeneration: data.imageModelIds.includes(model),
  };
}

/**
 * Validate model requirements
 * Throws error if model doesn't support required capabilities
 */
export async function validateModelCapabilities(
  model: string,
  env: Env,
  requirements: {
    vision?: boolean;
    codeInterpreter?: boolean;
  },
): Promise<void> {
  const data = await getModelData(env);

  if (requirements.vision && !data.visionModelIds.includes(model)) {
    throw new ValidationError(
      `Model '${model}' does not support image inputs`,
      "model",
      "model_not_supported",
    );
  }

  if (
    requirements.codeInterpreter &&
    !data.codeInterpreterModelIds.includes(model)
  ) {
    throw new ValidationError(
      `Model '${model}' does not support code interpreter`,
      "model",
      "model_not_supported",
    );
  }
}
