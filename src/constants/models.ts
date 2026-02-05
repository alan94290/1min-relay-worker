/**
 * Model definitions and supported features
 */

// Define available models (synced with utils/constants.py)
export const ALL_ONE_MIN_AVAILABLE_MODELS = [
  // OpenAI
  "dall-e-2", // Image generation
  "dall-e-3", // Image generation
  "gpt-3.5-turbo",
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4.5-preview",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-chat-latest",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5.1",
  "gpt-5.1-codex",
  "gpt-5.1-codex-mini",
  "gpt-5.2",
  "gpt-5.2-pro",
  "o1",
  "o1-mini",
  "o3-mini",
  "o4-mini",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "tts-1", // Text-to-speech
  "tts-1-hd", // Text-to-speech HD
  "whisper-1", // Speech recognition
  // Claude
  "claude-2.1",
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-7-sonnet-20250219",
  "claude-3-haiku-20240307",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-haiku-4-5-20251001",
  "claude-instant-1.2",
  "claude-opus-4-20250514",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  // GoogleAI
  "gemini-1.0-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-pro",
  "gemini-2.5-pro-preview-05-06",
  "gemini-3-pro-preview",
  // MistralAI
  "mistral-large-latest",
  "mistral-nemo",
  "mistral-small-latest",
  "open-mistral-7b",
  "open-mixtral-8x22b",
  "open-mixtral-8x7b",
  "pixtral-12b",
  // Replicate
  "meta/llama-2-70b-chat",
  "meta/llama-4-maverick-instruct",
  "meta/llama-4-scout-instruct",
  "meta/meta-llama-3-70b-instruct",
  "meta/meta-llama-3.1-405b-instruct",
  // DeepSeek
  "deepseek-chat",
  "deepseek-reasoner",
  // Cohere
  "command",
  // xAI
  "grok-2",
  "grok-3",
  "grok-3-mini",
  "grok-4-0709",
  "grok-4-fast-non-reasoning",
  "grok-4-fast-reasoning",
  // Perplexity Sonar
  "sonar",
  "sonar-pro",
  "sonar-reasoning",
  "sonar-reasoning-pro",
  // Leonardo.ai models
  "albedo-base-xl", // Leonardo.ai base model
  "anime-xl", // Leonardo.ai anime style
  "diffusion-xl", // Leonardo.ai diffusion model
  "kino-xl", // Leonardo.ai cinematic style
  "lightning-xl", // Leonardo.ai fast generation
  "phoenix", // Leonardo.ai artistic model
  "vision-xl", // Leonardo.ai vision model
  // Midjourney
  "midjourney", // Midjourney image generation
  "midjourney_6_1", // Midjourney v6.1
  // Flux models
  "flux-1.1-pro", // Flux Pro v1.1
  "flux-dev", // Flux development model
  "flux-pro", // Flux professional model
  "flux-schnell", // Flux fast generation
  // Qwen models
  "qwen-image-plus", // Qwen image generation plus
  "qwen-image-max", // Qwen image generation max
  "qwen-image-edit-plus", // Qwen image editing plus
  "qwen3-tts-flash", // Qwen text-to-speech flash
  "qwen3-asr-flash", // Qwen speech recognition flash
  "qwen3-livetranslate-flash", // Qwen live translation flash
];

// Define models that support vision inputs (synced with utils/constants.py)
export const VISION_SUPPORTED_MODELS = [
  "gpt-4-turbo",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-chat-latest",
  "gpt-5-mini",
  "grok-4-fast-non-reasoning",
  "grok-4-fast-reasoning"
];

// Define models that support code interpreter
export const CODE_INTERPRETER_SUPPORTED_MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-opus-4-20250514",
  "claude-sonnet-4-20250514",
  "deepseek-chat",
  "deepseek-reasoner",
  "gpt-4o",
  "gpt-5",
  "gpt-5-chat-latest",
];

// Define models that support web search (retrieval)
export const RETRIEVAL_SUPPORTED_MODELS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-haiku-20240307",
  "claude-3-opus-20240229",
  "claude-3-sonnet-20240229",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-20250514",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  "command",
  "deepseek-chat",
  "deepseek-reasoner",
  "gemini-1.0-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  "gpt-3.5-turbo",
  "gpt-4-turbo",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-chat-latest",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5.1",
  "gpt-5.1-codex",
  "gpt-5.1-codex-mini",
  "gpt-5.2",
  "gpt-5.2-pro",
  "grok-2",
  "grok-3",
  "grok-3-mini",
  "grok-4-0709",
  "grok-4-fast-non-reasoning",
  "grok-4-fast-reasoning",
  "meta/llama-2-70b-chat",
  "meta/meta-llama-3-70b-instruct",
  "meta/meta-llama-3.1-405b-instruct",
  "mistral-large-latest",
  "mistral-nemo",
  "mistral-small-latest",
  "o1-mini",
  "o3-mini",
  "o4-mini",
  "open-mistral-7b",
  "open-mixtral-8x22b",
  "open-mixtral-8x7b",
  "pixtral-12b",
  "sonar",
  "sonar-pro",
  "sonar-reasoning",
  "sonar-reasoning-pro",
];

// Define models that support function calling
export const FUNCTION_CALLING_SUPPORTED_MODELS = ["gpt-3.5-turbo", "gpt-4"];

// Define models that support image generation (synced with utils/constants.py)
export const IMAGE_GENERATION_MODELS = [
  "albedo-base-xl",
  "anime-xl",
  "dall-e-2",
  "dall-e-3",
  "diffusion-xl",
  "flux-1.1-pro",
  "flux-dev",
  "flux-pro",
  "flux-schnell",
  "kino-xl",
  "lightning-xl",
  "midjourney",
  "midjourney_6_1",
  "phoenix",
  "qwen-image-plus",
  "qwen-image-max",
  "qwen-image-edit-plus",
  "stable-diffusion-v1-6",
  "stable-diffusion-xl-1024-v1-0",
  "vision-xl",
];

// Models that support image variations
export const VARIATION_SUPPORTED_MODELS = [
  "clipdrop",
  "dall-e-2",
  "dall-e-3",
  "midjourney",
  "midjourney_6_1",
  "qwen-image-edit-plus",
];

// Text-to-speech models
export const TEXT_TO_SPEECH_MODELS = ["tts-1", "tts-1-hd", "qwen3-tts-flash"];

// Speech-to-text models
export const SPEECH_TO_TEXT_MODELS = ["whisper-1", "qwen3-asr-flash"];
