/**
 * Model definitions and supported features
 */

// Define available models (synced with utils/constants.py)
export const ALL_ONE_MIN_AVAILABLE_MODELS = [
  // OpenAI
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5-chat-latest",
  "o1",
  "o1-mini",
  "o3-mini",
  "o4-mini",
  "gpt-4.5-preview",
  "gpt-4.1",
  "gpt-4.1-nano",
  "gpt-4.1-mini",
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
  "whisper-1", // Speech recognition
  "tts-1", // Text-to-speech
  "tts-1-hd", // Text-to-speech HD
  "dall-e-2", // Image generation
  "dall-e-3", // Image generation
  // Claude
  "claude-instant-1.2",
  "claude-2.1",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-haiku-20241022",
  "claude-3-7-sonnet-20250219",
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  // GoogleAI
  "gemini-1.0-pro",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-pro-preview-05-06",
  // MistralAI
  "mistral-large-latest",
  "mistral-small-latest",
  "mistral-nemo",
  "pixtral-12b",
  "open-mixtral-8x22b",
  "open-mixtral-8x7b",
  "open-mistral-7b",
  // Replicate
  "meta/llama-2-70b-chat",
  "meta/meta-llama-3-70b-instruct",
  "meta/meta-llama-3.1-405b-instruct",
  "meta/llama-4-maverick-instruct",
  "meta/llama-4-scout-instruct",
  // DeepSeek
  "deepseek-chat",
  "deepseek-reasoner",
  // Cohere
  "command",
  // xAI
  "grok-2",
  // Perplexity Sonar
  "sonar-reasoning-pro",
  "sonar-reasoning",
  "sonar-pro",
  "sonar",
  // Leonardo.ai models
  "phoenix", // Leonardo.ai artistic model
  "lightning-xl", // Leonardo.ai fast generation
  "anime-xl", // Leonardo.ai anime style
  "diffusion-xl", // Leonardo.ai diffusion model
  "kino-xl", // Leonardo.ai cinematic style
  "vision-xl", // Leonardo.ai vision model
  "albedo-base-xl", // Leonardo.ai base model
  // Midjourney
  "midjourney", // Midjourney image generation
  "midjourney_6_1", // Midjourney v6.1
  // Flux models
  "flux-schnell", // Flux fast generation
  "flux-dev", // Flux development model
  "flux-pro", // Flux professional model
  "flux-1.1-pro", // Flux Pro v1.1
];

// Define models that support vision inputs (synced with utils/constants.py)
export const VISION_SUPPORTED_MODELS = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-chat-latest",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo"
];

// Define models that support code interpreter
export const CODE_INTERPRETER_SUPPORTED_MODELS = [
  "gpt-5",
  "gpt-5-chat-latest",
  "gpt-4o",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-haiku-20241022",
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "deepseek-chat",
  "deepseek-reasoner",
];

// Define models that support web search (retrieval)
export const RETRIEVAL_SUPPORTED_MODELS = [
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5-chat-latest",
  "gemini-1.0-pro",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "o1-mini",
  "o3-mini",
  "o4-mini",
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-3-haiku-20240307",
  "claude-3-5-haiku-20241022",
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "mistral-large-latest",
  "mistral-small-latest",
  "mistral-nemo",
  "pixtral-12b",
  "open-mixtral-8x22b",
  "open-mixtral-8x7b",
  "open-mistral-7b",
  "meta/llama-2-70b-chat",
  "meta/meta-llama-3-70b-instruct",
  "meta/meta-llama-3.1-405b-instruct",
  "command",
  "grok-2",
  "deepseek-chat",
  "deepseek-reasoner",
  "sonar-reasoning-pro",
  "sonar-reasoning",
  "sonar-pro",
  "sonar",
];

// Define models that support function calling
export const FUNCTION_CALLING_SUPPORTED_MODELS = ["gpt-4", "gpt-3.5-turbo"];

// Define models that support image generation (synced with utils/constants.py)
export const IMAGE_GENERATION_MODELS = [
  "dall-e-3",
  "dall-e-2",
  "stable-diffusion-xl-1024-v1-0",
  "stable-diffusion-v1-6",
  "midjourney",
  "midjourney_6_1",
  "phoenix",
  "lightning-xl",
  "anime-xl",
  "diffusion-xl",
  "kino-xl",
  "vision-xl",
  "albedo-base-xl",
  "flux-schnell",
  "flux-dev",
  "flux-pro",
  "flux-1.1-pro",
];

// Models that support image variations
export const VARIATION_SUPPORTED_MODELS = [
  "midjourney",
  "midjourney_6_1",
  "dall-e-2",
  "dall-e-3",
  "clipdrop",
];

// Text-to-speech models
export const TEXT_TO_SPEECH_MODELS = ["tts-1", "tts-1-hd"];

// Speech-to-text models
export const SPEECH_TO_TEXT_MODELS = ["whisper-1"];
