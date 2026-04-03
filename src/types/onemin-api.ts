/**
 * 1min.ai API specific types
 */

export interface OneMinPromptObject {
  prompt: string;
  isMixed?: boolean;
  imageList?: string[];
  webSearch?: boolean;
  numOfSite?: number;
  maxWord?: number;
  n?: number;
  size?: string;
  // Audio (Speech-to-Text / Audio Translator) fields
  audioUrl?: string;
  response_format?: string; // snake_case: matches 1min.ai API field name
  temperature?: number;
  language?: string;
}

export interface OneMinRequestBody {
  type: string;
  conversationId?: string;
  model: string;
  promptObject: OneMinPromptObject;
  metadata?: {
    messageGroup: string;
  };
}
