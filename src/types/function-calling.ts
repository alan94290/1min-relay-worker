/**
 * Function calling types following OpenAI API specification
 */

export interface FunctionParameter {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
  enum?: string[];
  items?: any;
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: FunctionParameter;
}

export interface Tool {
  type: "function";
  function: FunctionDefinition;
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: FunctionCall;
}

export interface ChatCompletionRequestWithTools {
  model?: string;
  messages: any[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Tool[];
  tool_choice?: "none" | "auto" | "required" | { type: "function"; function: { name: string } };
  // Legacy function calling format
  functions?: FunctionDefinition[];
  function_call?: "none" | "auto" | { name: string };
}

export interface ChatCompletionMessageWithToolCalls {
  role: "assistant";
  content: string | null;
  tool_calls?: ToolCall[];
  // Legacy format
  function_call?: FunctionCall;
}