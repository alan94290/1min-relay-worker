/**
 * Model name parser for handling :online suffix functionality
 */

import { RETRIEVAL_SUPPORTED_MODELS } from "../constants/models";
import type { Env } from "../types";

export interface ModelParseResult {
  originalModel: string;
  hasOnlineSuffix: boolean;
  isValid: boolean;
  error?: string;
}

export interface WebSearchConfig {
  webSearch: boolean;
  numOfSite: number;
  maxWord: number;
}

const ONLINE_SUFFIX = ":online";
const DEFAULT_NUM_OF_SITE = 1;
const DEFAULT_MAX_WORD = 500;

/**
 * Parse model name and detect :online suffix
 */
export function parseModelName(modelName: string): ModelParseResult {
  if (!modelName || typeof modelName !== "string") {
    return {
      originalModel: "",
      hasOnlineSuffix: false,
      isValid: false,
      error: "Model name cannot be empty",
    };
  }

  const trimmedModel = modelName.trim();

  // Check for multiple colons (invalid format)
  const colonCount = (trimmedModel.match(/:/g) || []).length;
  if (colonCount > 1) {
    return {
      originalModel: "",
      hasOnlineSuffix: false,
      isValid: false,
      error: "Invalid model name format. Only ':online' suffix is supported",
    };
  }

  // Check if model has :online suffix
  if (trimmedModel.endsWith(ONLINE_SUFFIX)) {
    const originalModel = trimmedModel.slice(0, -ONLINE_SUFFIX.length);

    // Validate that original model name is not empty
    if (!originalModel) {
      return {
        originalModel: "",
        hasOnlineSuffix: true,
        isValid: false,
        error: "Model name cannot be empty",
      };
    }

    // Check if the original model supports web search
    if (!validateModelSupportsWebSearch(originalModel)) {
      return {
        originalModel,
        hasOnlineSuffix: true,
        isValid: false,
        error: `Model '${originalModel}' does not support web search functionality`,
      };
    }

    return {
      originalModel,
      hasOnlineSuffix: true,
      isValid: true,
    };
  }

  // Check for invalid suffix (colon present but not :online)
  if (trimmedModel.includes(":")) {
    return {
      originalModel: "",
      hasOnlineSuffix: false,
      isValid: false,
      error: "Invalid model name format. Only ':online' suffix is supported",
    };
  }

  // Standard model name without suffix
  return {
    originalModel: trimmedModel,
    hasOnlineSuffix: false,
    isValid: true,
  };
}

/**
 * Get web search configuration with default values
 */
export function getWebSearchConfig(env?: Partial<Env>): WebSearchConfig {
  const numOfSite = env?.WEB_SEARCH_NUM_OF_SITE
    ? parseInt(env.WEB_SEARCH_NUM_OF_SITE, 10)
    : DEFAULT_NUM_OF_SITE;

  const maxWord = env?.WEB_SEARCH_MAX_WORD
    ? parseInt(env.WEB_SEARCH_MAX_WORD, 10)
    : DEFAULT_MAX_WORD;

  return {
    webSearch: true,
    numOfSite:
      Number.isNaN(numOfSite) || numOfSite <= 0
        ? DEFAULT_NUM_OF_SITE
        : numOfSite,
    maxWord: Number.isNaN(maxWord) || maxWord <= 0 ? DEFAULT_MAX_WORD : maxWord,
  };
}

/**
 * Check if a model supports web search functionality
 */
export function validateModelSupportsWebSearch(model: string): boolean {
  return RETRIEVAL_SUPPORTED_MODELS.includes(model);
}

/**
 * Parse model name and return both clean model and web search config if applicable
 */
export function parseAndGetConfig(
  modelName: string,
  env?: Partial<Env>,
): {
  cleanModel: string;
  webSearchConfig?: WebSearchConfig;
  error?: string;
} {
  const parseResult = parseModelName(modelName);

  if (!parseResult.isValid) {
    return {
      cleanModel: "",
      error: parseResult.error,
    };
  }

  if (parseResult.hasOnlineSuffix) {
    return {
      cleanModel: parseResult.originalModel,
      webSearchConfig: getWebSearchConfig(env),
    };
  }

  return {
    cleanModel: parseResult.originalModel,
  };
}
