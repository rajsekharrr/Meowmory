import { createLLMProvider, classifyQuery } from "@/lib/providers/llm";
import { generateEmbedding } from "@/lib/memory/embeddings";
import { retrieveRelevantMemory } from "@/lib/pipeline/memory-retrieval";
import { buildSearchPlan } from "@/lib/pipeline/query-planner";
import { executeSearch } from "@/lib/pipeline/search";
import { detectChanges } from "@/lib/pipeline/change-detector";
import { saveMessage } from "@/lib/memory/writer";
import type { SearchResult, ChangeDiff, StreamEvent } from "@/lib/supabase/types";
import type { LLMProvider } from "@/lib/providers/llm";
import type { AnthropicProvider } from "@/lib/providers/anthropic";
import type { OpenAIProvider } from "@/lib/providers/openai";

export const runtime = "nodejs";

function formatResults(results: SearchResult[]): string {
  return results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 300)}${r.published_date ? `\nPublished: ${r.published_date}` : ""}`,
    )
    .join("\n\n");
}

function formatChangeDiff(diff: ChangeDiff): string {
  const lines: string[] = [];
  for (const item of diff.changed)
    lines.push(`CHANGED — ${item.entity}: ${item.description}${item.source_url ? ` (${item.source_url})` : ""}`);
  for (const item of diff.new_items)
    lines.push(`NEW — ${item.entity}: ${item.description}${item.source_url ? ` (${item.source_url})` : ""}`);
  for (const item of diff.removed)
    lines.push(`REMOVED — ${item.entity}: ${item.description}${item.source_url ? ` (${item.source_url})` : ""}`);
  for (const item of diff.unchanged)
    lines.push(`UNCHANGED — ${item.entity}: ${item.description}`);
  return lines.join("\n");
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json(
      { error: "Add your API key in settings to use Meowmory" },
      { status: 401 },
    );
  }

  const timezone = req.headers.get("x-timezone") ?? "UTC";

  let body: {
    message: string;
    conversationId: string | null;
    sessionId: string;
    provider: LLMProvider;
    model: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message, conversationId, sessionId, provider, model } = body;

  if (!message || !sessionId || !provider || !model) {
    return Response.json(
      { error: "Missing required fields: message, sessionId, provider, model" },
      { status: 400 },
    );
  }

  // Resolve conversationId — use provided one or create a new UUID
  const activeConversationId = conversationId ?? crypto.randomUUID();

  const llmProvider = createLLMProvider(provider, apiKey, model);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: StreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      let fullResponse = "";
      let currentResults: SearchResult[] = [];
      let changeDiff: ChangeDiff | null = null;

      try {
        // ── STEP 1: Classify ────────────────────────────────────────────────
        send({ type: "status", content: "figuring out what you need..." });

        const classification = await classifyQuery(llmProvider, message, []);
        const { query_type, entities, time_reference, original_topic } = classification;

        // ── STEP 2: Memory Retrieval ────────────────────────────────────────
        send({ type: "status", content: "checking my memory..." });

        const embedding = await generateEmbedding(message, provider, apiKey);

        const memory = await retrieveRelevantMemory(
          sessionId,
          {
            query_type,
            time_reference,
            original_topic: original_topic ?? message,
            entities,
          },
          timezone,
          embedding,
        );

        // ── STEP 3: Search Planning + Execution ─────────────────────────────
        const plan = buildSearchPlan({
          query_type,
          user_message: message,
          entities,
          time_reference,
          original_topic: original_topic ?? message,
          past_messages: memory.past_messages,
          pinned_context: memory.pinned_context,
        });

        if (plan.queries.length > 0) {
          send({
            type: "status",
            content:
              plan.queries.length === 1
                ? "sniffing around..."
                : `hunting across ${plan.queries.length} sources...`,
          });

          const tavilyKey = process.env.TAVILY_API_KEY;
          if (!tavilyKey) throw new Error("TAVILY_API_KEY is not configured");

          currentResults = await executeSearch(plan, tavilyKey);
          send({ type: "status", content: `found ${currentResults.length} sources` });
        }

        // ── STEP 4: Change Detection ─────────────────────────────────────────
        if (query_type === "staleness_check" || query_type === "multi_entity") {
          const pastResults = memory.past_messages.flatMap(
            (m) => (m.search_results as SearchResult[] | null) ?? [],
          );
          if (pastResults.length > 0) {
            send({ type: "status", content: "comparing what changed..." });
            changeDiff = await detectChanges(
              pastResults,
              currentResults,
              entities,
              llmProvider as AnthropicProvider | OpenAIProvider,
            );
          }
        }

        // ── STEP 5: Synthesis (streaming) ────────────────────────────────────
        const systemPrompt = `You are Meowmory, a research assistant with persistent memory and live web search.
You remember everything the user has asked before and can detect what changed over time.
Be direct, precise, and cite sources. When showing changes, be explicit: "X changed from Y to Z".

Current date: ${new Date().toISOString().split("T")[0]}
User's pinned context: ${memory.pinned_context ?? "none"}`;

        const parts: string[] = [];

        if (memory.pinned_context) {
          parts.push(`My context: ${memory.pinned_context}`);
        }

        if (
          memory.past_messages.length > 0 &&
          (query_type === "recall_query" || query_type === "staleness_check")
        ) {
          const formatted = memory.past_messages
            .map(
              (m) =>
                `[${m.created_at.slice(0, 10)}] ${m.role === "user" ? "You" : "Meowmory"}: ${m.content.slice(0, 400)}`,
            )
            .join("\n");
          parts.push(`Relevant past conversations:\n${formatted}`);
        }

        if (currentResults.length > 0) {
          parts.push(`Search results:\n${formatResults(currentResults)}`);
        }

        if (changeDiff) {
          parts.push(`Change analysis:\n${formatChangeDiff(changeDiff)}`);
        }

        parts.push(message);

        const userContent = parts.join("\n\n");

        const streamResult = await llmProvider.chat(
          [{ role: "user", content: userContent }],
          systemPrompt,
          true,
        );

        if (typeof streamResult === "string") {
          // Non-streaming fallback (should not happen with stream: true, but be safe)
          fullResponse = streamResult;
          send({ type: "delta", content: streamResult });
        } else {
          for await (const chunk of streamResult) {
            fullResponse += chunk;
            send({ type: "delta", content: chunk });
          }
        }

        // ── STEP 6: Send metadata ─────────────────────────────────────────────
        send({ type: "sources", sources: currentResults.slice(0, 5) });
        if (changeDiff) {
          send({ type: "diff", diff: changeDiff });
        }

        // ── STEP 7: Fire-and-forget memory persistence ───────────────────────
        const searchQueries = plan.queries.map((q) => q.query);
        Promise.resolve().then(async () => {
          try {
            await saveMessage({
              sessionId,
              conversationId: activeConversationId,
              role: "user",
              content: message,
              queryType: query_type,
              entities,
              searchQueries,
              embedding,
            });
            await saveMessage({
              sessionId,
              conversationId: activeConversationId,
              role: "assistant",
              content: fullResponse,
              changeDiff: changeDiff ?? undefined,
              searchResults: currentResults,
            });
          } catch (saveErr) {
            // Memory persistence must never crash the stream
            console.error("[memory] Failed to save messages:", saveErr);
          }
        });

        // ── STEP 8: Done ──────────────────────────────────────────────────────
        send({ type: "done", conversationId: activeConversationId });
      } catch (err) {
        console.error("[chat] Pipeline error:", err instanceof Error ? err.message : err);
        send({ type: "error", content: "something spooked the cat. try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
