import { createServerClient } from "@/lib/supabase/client";
import { generateEmbedding } from "@/lib/memory/embeddings";
import { semanticSearch } from "@/lib/memory/reader";
import type { LLMProvider } from "@/lib/providers/llm";
import type { Message } from "@/lib/supabase/types";

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const sessionId = searchParams.get("sessionId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 20) : 5;

  if (!sessionId) {
    return Response.json({ error: "Missing sessionId query param" }, { status: 400 });
  }
  if (!q) {
    return Response.json({ error: "Missing q query param" }, { status: 400 });
  }

  // Try semantic search first if an API key + provider are supplied via headers
  const apiKey = req.headers.get("x-api-key");
  const provider = (req.headers.get("x-provider") ?? "openai") as LLMProvider;

  try {
    if (apiKey && provider === "openai") {
      const embedding = await generateEmbedding(q, provider, apiKey);
      if (embedding) {
        const results = await semanticSearch(sessionId, embedding, limit);
        return Response.json(results);
      }
    }

    // Fallback: keyword search over message content
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("user_session_id", sessionId)
      .eq("role", "user")
      .ilike("content", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return Response.json((data ?? []) as Message[]);
  } catch (err) {
    console.error("[memory/search] error:", err);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
