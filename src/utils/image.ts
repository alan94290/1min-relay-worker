/**
 * Image processing utilities
 */

import { MessageContent, TextContent, ImageContent } from "../types";

/**
 * Checks if URL is an image URL
 * @param url - URL to check
 * @returns boolean - True if URL is an image URL
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
  const lowerUrl = url.toLowerCase();
  return (
    imageExtensions.some((ext) => lowerUrl.includes(ext)) ||
    lowerUrl.includes("data:image/") ||
    lowerUrl.includes("base64")
  );
}

/**
 * Extracts image URL from message content
 * @param content - Message content that may contain images
 * @returns Image URL if found, null otherwise
 */
export function extractImageFromContent(
  content: MessageContent
): string | null {
  if (typeof content === "string") {
    return null;
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === "image_url" && item.image_url?.url) {
        return item.image_url.url;
      }
    }
  }

  return null;
}

/**
 * Processes image URL (base64 or HTTP URL) and returns binary data
 * @param imageUrl - Image URL (base64 or HTTP)
 * @returns Promise<ArrayBuffer> - Binary image data
 */
export async function processImageUrl(imageUrl: string): Promise<ArrayBuffer> {
  if (imageUrl.startsWith("data:image/png;base64,")) {
    // Handle base64 encoded image (matching Python logic exactly)
    const base64Data = imageUrl.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid base64 image format");
    }

    // Convert base64 to binary (matching Python's base64.b64decode)
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } else if (imageUrl.startsWith("data:image/")) {
    // Handle other base64 image formats
    const base64Data = imageUrl.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid base64 image format");
    }

    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } else {
    // Handle HTTP URL (matching Python logic: requests.get().content)
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; 1min-relay-worker/1.0; +https://1min.ai)",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }
    return await response.arrayBuffer();
  }
}

/**
 * Uploads image to 1min.ai asset API
 * @param imageData - Binary image data
 * @param apiKey - API key for authentication
 * @param assetUrl - Asset API URL
 * @returns Promise<string> - Image path from API response
 */
export async function uploadImageToAsset(
  imageData: ArrayBuffer,
  apiKey: string,
  assetUrl: string
): Promise<string> {
  const formData = new FormData();
  const filename = `relay${crypto.randomUUID()}`;
  const blob = new Blob([imageData], { type: "image/png" });

  formData.append("asset", blob, filename);

  const response = await fetch(assetUrl, {
    method: "POST",
    headers: {
      "API-KEY": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload image: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const result = (await response.json()) as { fileContent?: { path: string } };

  if (!result.fileContent?.path) {
    throw new Error("No image path returned from asset API");
  }

  return result.fileContent.path;
}

/**
 * Extracts text content from mixed content array
 * @param content - Mixed content array
 * @returns Combined text content
 */
export function extractTextFromContent(
  content: (TextContent | ImageContent)[]
): string {
  return content
    .filter((item): item is TextContent => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

/**
 * Checks if model supports vision inputs
 * @param model - Model name
 * @returns boolean - True if model supports vision
 */
export function isVisionSupportedModel(model: string): boolean {
  const visionSupportedModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
  return visionSupportedModels.includes(model);
}
