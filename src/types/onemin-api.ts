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
