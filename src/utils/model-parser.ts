/**
 * Model name parser for handling :online suffix functionality
 */

import { RETRIEVAL_SUPPORTED_MODELS } from "../constants/models";

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

export class ModelParser {
  private static readonly ONLINE_SUFFIX = ":online";
  private static readonly DEFAULT_NUM_OF_SITE = 1;
  private static readonly DEFAULT_MAX_WORD = 500;

  /**
   * Parse model name and detect :online suffix
   */
  static parseModelName(modelName: string): ModelParseResult {
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
    if (trimmedModel.endsWith(this.ONLINE_SUFFIX)) {
      const originalModel = trimmedModel.slice(0, -this.ONLINE_SUFFIX.length);

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
      if (!this.validateModelSupportsWebSearch(originalModel)) {
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
  static getWebSearchConfig(env?: any): WebSearchConfig {
    // Allow environment variables to override default values
    const numOfSite = env?.WEB_SEARCH_NUM_OF_SITE
      ? parseInt(env.WEB_SEARCH_NUM_OF_SITE, 10)
      : this.DEFAULT_NUM_OF_SITE;

    const maxWord = env?.WEB_SEARCH_MAX_WORD
      ? parseInt(env.WEB_SEARCH_MAX_WORD, 10)
      : this.DEFAULT_MAX_WORD;

    // Validate and use safe defaults if parsing fails
    return {
      webSearch: true,
      numOfSite:
        isNaN(numOfSite) || numOfSite <= 0
          ? this.DEFAULT_NUM_OF_SITE
          : numOfSite,
      maxWord: isNaN(maxWord) || maxWord <= 0 ? this.DEFAULT_MAX_WORD : maxWord,
    };
  }

  /**
   * Check if a model supports web search functionality
   */
  static validateModelSupportsWebSearch(model: string): boolean {
    return RETRIEVAL_SUPPORTED_MODELS.includes(model);
  }

  /**
   * Parse model name and return both clean model and web search config if applicable
   */
  static parseAndGetConfig(
    modelName: string,
    env?: any
  ): {
    cleanModel: string;
    webSearchConfig?: WebSearchConfig;
    error?: string;
  } {
    const parseResult = this.parseModelName(modelName);

    if (!parseResult.isValid) {
      return {
        cleanModel: "",
        error: parseResult.error,
      };
    }

    if (parseResult.hasOnlineSuffix) {
      return {
        cleanModel: parseResult.originalModel,
        webSearchConfig: this.getWebSearchConfig(env),
      };
    }

    return {
      cleanModel: parseResult.originalModel,
    };
  }
}
