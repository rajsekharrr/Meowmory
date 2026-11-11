import OpenAI from "openai";
import type { LLMProvider } from "@/lib/providers/llm";

const MAX_EMBED_CHARS = 8000;

/**
 * Generate a 1536-dim embedding vector for the given text.
 * Returns null for Anthropic provider (no embeddings API) or on any error.
 * Embeddings are optional — callers must handle null gracefully.
 */
export async function generateEmbedding(
  text: string,
  provider: LLMProvider,
  apiKey: string,
): Promise<number[] | null> {
  if (provider === "anthropic") {
    // Anthropic has no embeddings API — semantic search falls back to keyword
    return null;
  }

  try {
    const truncated = text.slice(0, MAX_EMBED_CHARS);
    const client = new OpenAI({ apiKey });
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: truncated,
    });
    return response.data[0].embedding;
  } catch (err) {
    // Log error details but never the key itself
    console.error("[embeddings] Failed to generate embedding:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
