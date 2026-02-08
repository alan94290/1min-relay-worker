/**
 * Model definitions and supported features
 */

// Define available models (synced with 1min.ai docs 2026-02-08)
export const ALL_ONE_MIN_AVAILABLE_MODELS = [
  // OpenAI
  "dall-e-2", // Image generation
  "dall-e-3", // Image generation
  "gpt-3.5-turbo",
  "gpt-4-turbo",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
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
  "o3",
  "o3-deep-research",
  "o3-mini",
  "o3-pro",
  "o4-mini",
  "o4-mini-deep-research",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "tts-1", // Text-to-speech
  "tts-1-hd", // Text-to-speech HD
  "whisper-1", // Speech recognition
  // Anthropic
  "claude-haiku-4-5-20251001",
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  // GoogleAI
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  // MistralAI
  "magistral-medium-latest",
  "magistral-small-latest",
  "ministral-14b-latest",
  "mistral-large-latest",
  "mistral-medium-latest",
  "mistral-small-latest",
  "open-mistral-nemo",
  // Replicate (Meta)
  "meta/llama-2-70b-chat",
  "meta/llama-4-maverick-instruct",
  "meta/llama-4-scout-instruct",
  "meta/meta-llama-3-70b-instruct",
  "meta/meta-llama-3.1-405b-instruct",
  // DeepSeek
  "deepseek-chat",
  "deepseek-reasoner",
  // Cohere
  "command-r-08-2024",
  // xAI
  "grok-3",
  "grok-3-mini",
  "grok-4-0709",
  "grok-4-fast-non-reasoning",
  "grok-4-fast-reasoning",
  "grok-code-fast-1",
  // Perplexity Sonar
  "sonar",
  "sonar-deep-research",
  "sonar-pro",
  "sonar-reasoning-pro",
  // Alibaba (Qwen chat)
  "qwen-flash",
  "qwen-max",
  "qwen-plus",
  "qwen3-max",
  // Alibaba (Qwen coder)
  "qwen3-coder-flash",
  "qwen3-coder-plus",
  // Alibaba (Qwen vision)
  "qwen-vl-max",
  "qwen-vl-plus",
  "qwen3-vl-flash",
  "qwen3-vl-plus",
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
  // Qwen media models
  "qwen-image-plus", // Qwen image generation plus
  "qwen-image-max", // Qwen image generation max
  "qwen-image-edit-plus", // Qwen image editing plus
  "qwen3-tts-flash", // Qwen text-to-speech flash
  "qwen3-asr-flash", // Qwen speech recognition flash
  "qwen3-livetranslate-flash", // Qwen live translation flash
];

// Define models that support vision inputs (CHAT_WITH_IMAGE)
export const VISION_SUPPORTED_MODELS = [
  // Anthropic
  "claude-haiku-4-5-20251001",
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  // GoogleAI
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  // OpenAI
  "gpt-4-turbo",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5",
  "gpt-5-chat-latest",
  "gpt-5-mini",
  "gpt-5.1",
  "gpt-5.2",
  // xAI
  "grok-4-fast-non-reasoning",
  "grok-4-fast-reasoning",
  // Alibaba (Qwen VL)
  "qwen-vl-max",
  "qwen-vl-plus",
  "qwen3-vl-flash",
  "qwen3-vl-plus",
];

// Define models that support code interpreter
export const CODE_INTERPRETER_SUPPORTED_MODELS = [
  "claude-opus-4-20250514",
  "claude-sonnet-4-20250514",
  "deepseek-chat",
  "deepseek-reasoner",
  "gpt-4o",
  "gpt-5",
  "gpt-5-chat-latest",
];

// Define models that support web search (retrieval)
// Synced with 1min.ai web search supported models 2026-02-08
export const RETRIEVAL_SUPPORTED_MODELS = [
  // Anthropic
  "claude-haiku-4-5-20251001",
  "claude-opus-4-1-20250805",
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  // DeepSeek
  "deepseek-chat",
  "deepseek-reasoner",
  // GoogleAI
  "gemini-3-pro-preview",
  // OpenAI
  "gpt-4o",
  "gpt-5",
  "gpt-5-chat-latest",
  "gpt-5.1-codex",
  "gpt-5.1-codex-mini",
  "o3",
  // xAI
  "grok-code-fast-1",
  // Alibaba
  "qwen3-coder-flash",
  "qwen3-coder-plus",
];

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
