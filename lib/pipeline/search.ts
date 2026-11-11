import { tavily } from "@tavily/core";
import type { SearchResult } from "@/lib/supabase/types";

export interface SearchPlan {
  queries: { query: string; entity_tag: string | null; freshness: boolean }[];
}

export async function executeSearch(
  plan: SearchPlan,
  tavilyApiKey: string,
): Promise<SearchResult[]> {
  if (plan.queries.length === 0) return [];

  const client = tavily({ apiKey: tavilyApiKey });

  const results = await Promise.all(
    plan.queries.map(async ({ query, entity_tag, freshness }) => {
      const params: Parameters<typeof client.search>[1] = {
        searchDepth: "advanced",
        maxResults: 5,
        includeAnswer: true,
        includeRawContent: false,
        includeImages: false,
        ...(freshness ? { days: 7 } : {}),
      };

      const response = await client.search(query, params);
      const timestamp = new Date().toISOString();

      return response.results.map((r): SearchResult => ({
        url: r.url,
        title: r.title,
        content: r.content,
        published_date: r.publishedDate ?? null,
        search_timestamp: timestamp,
        entity_tag,
      }));
    }),
  );

  // Deduplicate by URL — first occurrence wins
  const seen = new Set<string>();
  const combined: SearchResult[] = [];
  for (const batch of results) {
    for (const item of batch) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        combined.push(item);
      }
    }
  }
  return combined;
}
