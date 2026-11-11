import type { SearchResult, ChangeDiff, ChangeItem } from "@/lib/supabase/types";
import type { AnthropicProvider } from "@/lib/providers/anthropic";
import type { OpenAIProvider } from "@/lib/providers/openai";

export async function detectChanges(
  pastResults: SearchResult[],
  currentResults: SearchResult[],
  entities: string[],
  llmProvider: AnthropicProvider | OpenAIProvider,
): Promise<ChangeDiff> {
  // If no past results everything found now is new
  if (pastResults.length === 0) {
    return {
      changed: [],
      new_items: currentResults.map((r): ChangeItem => ({
        entity: r.entity_tag ?? "general",
        description: r.title,
        source_url: r.url,
      })),
      removed: [],
      unchanged: [],
    };
  }

  const formatResults = (results: SearchResult[]) =>
    results
      .map((r) => `${r.title} | ${r.url} | ${r.content.slice(0, 200)}`)
      .join("\n");

  const oldestPast = pastResults.reduce((oldest, r) =>
    r.search_timestamp < oldest.search_timestamp ? r : oldest,
  );

  const userPrompt = `ENTITIES: ${entities.join(", ") || "general topic"}

PAST RESULTS (found on ${oldestPast.search_timestamp}):
${formatResults(pastResults)}

CURRENT RESULTS (found now):
${formatResults(currentResults)}

Identify changes. For each item in changed/new_items/removed/unchanged:
- entity: which company/product/tool
- description: what specifically changed, in one clear sentence
- source_url: the URL this comes from

Return: {"changed":[],"new_items":[],"removed":[],"unchanged":[]}`;

  try {
    const raw = await llmProvider.chat(
      [{ role: "user", content: userPrompt }],
      "You are a precise change detector. Compare two sets of search results about the same topic and identify what changed. Respond with valid JSON only.",
      false,
    );

    const text = typeof raw === "string" ? raw : "";

    // Strip markdown code fences if the model wrapped the JSON
    const jsonText = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(jsonText) as ChangeDiff;
  } catch {
    // Fallback: treat all current results as new
    return {
      changed: [],
      new_items: currentResults.map((r): ChangeItem => ({
        entity: r.entity_tag ?? "general",
        description: r.title,
        source_url: r.url,
      })),
      removed: [],
      unchanged: [],
    };
  }
}

