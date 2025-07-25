/**
 * Models endpoint handler
 */

import {
  ALL_ONE_MIN_AVAILABLE_MODELS,
  VISION_SUPPORTED_MODELS,
  CODE_INTERPRETER_SUPPORTED_MODELS,
  RETRIEVAL_SUPPORTED_MODELS,
  FUNCTION_CALLING_SUPPORTED_MODELS,
} from "../constants";
import { createSuccessResponse } from "../utils";

export function handleModelsEndpoint(): Response {
  const models = ALL_ONE_MIN_AVAILABLE_MODELS.map((model) => ({
    id: model,
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: "1min-ai",
    permission: [],
    root: model,
    parent: null,
    // Add capability flags
    capabilities: {
      vision: VISION_SUPPORTED_MODELS.includes(model),
      code_interpreter: CODE_INTERPRETER_SUPPORTED_MODELS.includes(model),
      retrieval: RETRIEVAL_SUPPORTED_MODELS.includes(model),
      function_calling: FUNCTION_CALLING_SUPPORTED_MODELS.includes(model),
    },
  }));

  return createSuccessResponse({
    object: "list",
    data: models,
  });
}
