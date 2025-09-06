/**
 * Function calling utilities for converting between formats and parsing responses
 */

import { Tool, FunctionDefinition, ToolCall, FunctionCall } from "../types/function-calling";
import { Message } from "../types";

/**
 * Convert tools/functions to a system prompt that instructs the model how to call functions
 */
export function convertToolsToSystemPrompt(
  tools?: Tool[],
  functions?: FunctionDefinition[],
  toolChoice?: any,
  functionCall?: any
): string {
  const functionDefs = tools?.map(t => t.function) || functions || [];
  
  if (functionDefs.length === 0) {
    return "";
  }

  let prompt = "You have access to the following functions:\n\n";
  
  for (const func of functionDefs) {
    prompt += `Function: ${func.name}\n`;
    if (func.description) {
      prompt += `Description: ${func.description}\n`;
    }
    prompt += `Parameters: ${JSON.stringify(func.parameters, null, 2)}\n\n`;
  }

  prompt += `When you need to call a function, respond with a JSON block in this exact format:
<function_call>
{
  "name": "function_name",
  "arguments": "{\\"param1\\": \\"value1\\", \\"param2\\": \\"value2\\"}"
}
</function_call>

Important:
- The arguments field must be a valid JSON string (properly escaped)
- Only call functions when necessary to answer the user's request
- You can call multiple functions by including multiple <function_call> blocks
- After calling a function, wait for the result before proceeding
`;

  // Handle tool_choice/function_call directives
  if (toolChoice === "required" || functionCall === "auto") {
    prompt += "\nYou MUST call at least one function to respond to this request.\n";
  } else if (toolChoice === "none" || functionCall === "none") {
    prompt += "\nDo NOT call any functions for this request.\n";
  } else if (typeof toolChoice === "object" || typeof functionCall === "object") {
    const funcName = toolChoice?.function?.name || functionCall?.name;
    if (funcName) {
      prompt += `\nYou MUST call the function "${funcName}" to respond to this request.\n`;
    }
  }

  return prompt;
}

/**
 * Inject system prompt into messages array
 */
export function injectFunctionSystemPrompt(
  messages: Message[],
  systemPrompt: string
): Message[] {
  if (!systemPrompt) {
    return messages;
  }

  // Check if there's already a system message
  const systemMessageIndex = messages.findIndex(m => m.role === "system");
  
  if (systemMessageIndex >= 0 && messages[systemMessageIndex]) {
    // Append to existing system message
    const systemMessage = messages[systemMessageIndex];
    const existingContent = systemMessage.content;
    const updatedContent = typeof existingContent === "string" 
      ? `${existingContent}\n\n${systemPrompt}`
      : existingContent;
      
    return [
      ...messages.slice(0, systemMessageIndex),
      {
        role: systemMessage.role,
        content: updatedContent,
        name: systemMessage.name,
        function_call: systemMessage.function_call
      } as Message,
      ...messages.slice(systemMessageIndex + 1)
    ];
  } else {
    // Add new system message at the beginning
    return [
      {
        role: "system",
        content: systemPrompt
      },
      ...messages
    ];
  }
}

/**
 * Parse function calls from AI response
 */
export function parseFunctionCallsFromResponse(content: string): {
  cleanContent: string;
  toolCalls?: ToolCall[];
  functionCall?: FunctionCall;
} {
  const functionCallRegex = /<function_call>\s*([\s\S]*?)\s*<\/function_call>/g;
  const matches = Array.from(content.matchAll(functionCallRegex));
  
  if (matches.length === 0) {
    return { cleanContent: content };
  }

  // Remove function call blocks from content
  let cleanContent = content;
  for (const match of matches) {
    cleanContent = cleanContent.replace(match[0], "").trim();
  }

  // Parse function calls
  const toolCalls: ToolCall[] = [];
  let firstFunctionCall: FunctionCall | undefined;

  for (const match of matches) {
    try {
      const jsonStr = match[1]?.trim();
      if (!jsonStr) continue;
      const parsed = JSON.parse(jsonStr);
      
      if (parsed && parsed.name && typeof parsed.arguments === "string") {
        const functionCall: FunctionCall = {
          name: parsed.name,
          arguments: parsed.arguments
        };

        if (!firstFunctionCall) {
          firstFunctionCall = functionCall;
        }

        toolCalls.push({
          id: `call_${generateId()}`,
          type: "function",
          function: functionCall
        });
      }
    } catch (error) {
      console.error("Failed to parse function call:", error);
    }
  }

  // Return in both formats for compatibility
  if (toolCalls.length > 0) {
    return {
      cleanContent: cleanContent || "",
      toolCalls,
      functionCall: firstFunctionCall
    };
  }

  return { cleanContent: content };
}

/**
 * Generate a random ID for tool calls
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Check if request contains function calling parameters
 */
export function hasFunctionCallingParams(request: any): boolean {
  return !!(request.tools?.length || request.functions?.length);
}

/**
 * Transform response to include function calls
 */
export function transformResponseWithFunctionCalls(
  response: any,
  toolCalls?: ToolCall[],
  functionCall?: FunctionCall
): any {
  if (!toolCalls?.length && !functionCall) {
    return response;
  }

  // For non-streaming responses
  if (response.choices?.[0]) {
    const choice = response.choices[0];
    
    // Modern format with tool_calls
    if (toolCalls?.length) {
      choice.message = {
        ...choice.message,
        tool_calls: toolCalls,
        content: choice.message.content || null
      };
    }
    
    // Legacy format with function_call
    if (functionCall) {
      choice.message = {
        ...choice.message,
        function_call: functionCall,
        content: choice.message.content || null
      };
    }

    // Update finish reason if function was called
    if (toolCalls?.length || functionCall) {
      choice.finish_reason = "tool_calls";
    }
  }

  return response;
}

/**
 * Transform streaming chunk with function calls
 */
export function transformStreamChunkWithFunctionCalls(
  chunk: any,
  toolCalls?: ToolCall[],
  functionCall?: FunctionCall
): any {
  if (!toolCalls?.length && !functionCall) {
    return chunk;
  }

  if (chunk.choices?.[0]) {
    const choice = chunk.choices[0];
    
    // For streaming, send tool_calls in delta
    if (toolCalls?.length) {
      choice.delta = {
        ...choice.delta,
        tool_calls: toolCalls
      };
    }
    
    if (functionCall) {
      choice.delta = {
        ...choice.delta,
        function_call: functionCall
      };
    }
  }

  return chunk;
}