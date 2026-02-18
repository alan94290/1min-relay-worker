/**
 * Models endpoint handler
 */

import {
  ALL_ONE_MIN_AVAILABLE_MODELS,
  CODE_INTERPRETER_SUPPORTED_MODELS,
  RETRIEVAL_SUPPORTED_MODELS,
  VISION_SUPPORTED_MODELS,
} from "../constants";
import type { ModelObject, ModelsResponse } from "../types";
import { createSuccessResponse } from "../utils";

export function handleModelsEndpoint(): Response {
  const models: ModelObject[] = ALL_ONE_MIN_AVAILABLE_MODELS.map((model) => ({
    id: model,
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "1min-ai",
    permission: [] as unknown[],
    root: model,
    parent: null as unknown,
    // Add capability flags
    capabilities: {
      vision: VISION_SUPPORTED_MODELS.includes(model),
      code_interpreter: CODE_INTERPRETER_SUPPORTED_MODELS.includes(model),
      retrieval: RETRIEVAL_SUPPORTED_MODELS.includes(model),
    },
  }));

  const response: ModelsResponse = {
    object: "list",
    data: models,
  };

  return createSuccessResponse(response);
}
