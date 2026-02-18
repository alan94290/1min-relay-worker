/**
 * Dynamic model registry that fetches model data from the 1min.ai API
 * with two-tier caching: in-memory (5min) + KV (1hr)
 */

import type { CachedModelData, Env, OneMinModelEntry } from "../types";
import { ApiError } from "../utils/errors";

const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const KV_TTL_SECONDS = 60 * 60; // 1 hour
const KV_KEY = "model-data";
const FETCH_TIMEOUT_MS = 5000;

// Module-level in-memory cache
let memoryCache: CachedModelData | null = null;
let memoryCacheExpiry = 0;

// Deduplication: single inflight fetch shared across concurrent callers
let inflight: Promise<CachedModelData> | null = null;

function isValidCachedData(data: unknown): data is CachedModelData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.chatModelIds) && Array.isArray(d.imageModelIds);
}

function processModels(
  chatModels: OneMinModelEntry[],
  imageModels: OneMinModelEntry[],
): CachedModelData {
  // Deduplicate by modelId (chat models take priority)
  const seen = new Set<string>();
  const allEntries: OneMinModelEntry[] = [];

  for (const model of chatModels) {
    if (!seen.has(model.modelId)) {
      seen.add(model.modelId);
      allEntries.push(model);
    }
  }
  for (const model of imageModels) {
    if (!seen.has(model.modelId)) {
      seen.add(model.modelId);
      allEntries.push(model);
    }
  }

  const chatModelIds = chatModels.map((m) => m.modelId);
  const imageModelIds = imageModels.map((m) => m.modelId);

  const visionModelIds = chatModels
    .filter((m) => m.features.includes("CHAT_WITH_IMAGE"))
    .map((m) => m.modelId);

  const codeInterpreterModelIds = chatModels
    .filter((m) => m.features.includes("CODE_GENERATOR"))
    .map((m) => m.modelId);

  return {
    chatModelIds,
    imageModelIds,
    visionModelIds,
    codeInterpreterModelIds,
    entries: allEntries,
    fetchedAt: Date.now(),
  };
}

async function fetchModelsFromAPI(
  apiUrl: string,
  feature: string,
): Promise<OneMinModelEntry[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}?feature=${feature}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Models API returned ${response.status} for feature=${feature}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    if (!Array.isArray(data.models)) {
      throw new Error(
        `Unexpected API response shape for feature=${feature}: missing models array`,
      );
    }
    return data.models as OneMinModelEntry[];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAndProcess(env: Env): Promise<CachedModelData> {
  const [chatModels, imageModels] = await Promise.all([
    fetchModelsFromAPI(env.ONE_MIN_MODELS_API_URL, "UNIFY_CHAT_WITH_AI"),
    fetchModelsFromAPI(env.ONE_MIN_MODELS_API_URL, "IMAGE_GENERATOR"),
  ]);

  return processModels(chatModels, imageModels);
}

/**
 * Get model data with two-tier cache: in-memory (5min) → KV (1hr) → API
 * Concurrent callers share a single inflight fetch (thundering herd protection).
 */
export async function getModelData(env: Env): Promise<CachedModelData> {
  // 1. Check in-memory cache
  if (memoryCache && Date.now() < memoryCacheExpiry) {
    return memoryCache;
  }

  // 2. Check KV cache
  if (env.MODEL_CACHE) {
    try {
      const kvData = await env.MODEL_CACHE.get(KV_KEY, "json");
      if (isValidCachedData(kvData)) {
        memoryCache = kvData;
        memoryCacheExpiry = Date.now() + MEMORY_TTL_MS;
        return kvData;
      }
    } catch (e) {
      console.error("KV read error:", e);
    }
  }

  // 3. Deduplicate concurrent API fetches
  if (inflight) {
    return inflight;
  }

  inflight = fetchAndProcess(env)
    .then((data) => {
      // Store in memory
      memoryCache = data;
      memoryCacheExpiry = Date.now() + MEMORY_TTL_MS;

      // Store in KV (non-blocking)
      if (env.MODEL_CACHE) {
        env.MODEL_CACHE.put(KV_KEY, JSON.stringify(data), {
          expirationTtl: KV_TTL_SECONDS,
        }).catch((e: unknown) => console.error("KV write error:", e));
      }

      return data;
    })
    .catch((e) => {
      console.error("Failed to fetch models from API:", e);

      // Return stale in-memory cache if available (better than nothing)
      if (memoryCache) {
        console.warn("Using stale in-memory cache as fallback");
        memoryCacheExpiry = Date.now() + MEMORY_TTL_MS;
        return memoryCache;
      }

      throw new ApiError(
        "Unable to fetch model list from upstream API. Please try again shortly.",
        503,
      );
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Check if a model exists in chat or image models
 */
export async function isValidModel(model: string, env: Env): Promise<boolean> {
  const data = await getModelData(env);
  return (
    data.chatModelIds.includes(model) || data.imageModelIds.includes(model)
  );
}

/**
 * Check if a model supports vision (CHAT_WITH_IMAGE feature)
 */
export async function isVisionModel(model: string, env: Env): Promise<boolean> {
  const data = await getModelData(env);
  return data.visionModelIds.includes(model);
}

/**
 * Check if a model supports code interpreter (CODE_GENERATOR feature)
 */
export async function isCodeInterpreterModel(
  model: string,
  env: Env,
): Promise<boolean> {
  const data = await getModelData(env);
  return data.codeInterpreterModelIds.includes(model);
}

/**
 * Check if a model supports image generation
 */
export async function isImageGenerationModel(
  model: string,
  env: Env,
): Promise<boolean> {
  const data = await getModelData(env);
  return data.imageModelIds.includes(model);
}

/**
 * Check if a model is a chat model (all chat models support web search)
 */
export async function isChatModel(model: string, env: Env): Promise<boolean> {
  const data = await getModelData(env);
  return data.chatModelIds.includes(model);
}
