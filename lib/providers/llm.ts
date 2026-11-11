import type { QueryType } from "../pipeline/classifier";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

export type { QueryType };
export type LLMProvider = "anthropic" | "openai";

export interface ClassificationResult {
  query_type: QueryType;
  entities: string[];
  time_reference: string | null;
  original_topic: string;
}

// Exact prompt required by the pipeline spec — do not edit without updating tests
export const CLASSIFIER_SYSTEM = `You are a query classifier for a research assistant with persistent memory and web search.
Classify the user message into exactly one type:

- new_query: Fresh question, no reference to past conversations
- recall_query: User wants to retrieve something from memory ("what did I ask", "remind me", "find my past question about")
- staleness_check: User wants to know if past info is still current ("has X changed since", "is that still true", "any updates on")
- multi_entity: User refers to a list from a past message ("those 5 tools", "the options from Monday", "that shortlist")

Extract:
- entities: Named companies, products, tools, services mentioned (array, empty if none)
- time_reference: Any date/time reference as written ("last Tuesday", "November 3", "Monday") or null
- original_topic: The core subject in 3-5 words

Respond with valid JSON only. No explanation. No markdown.
Example: {"query_type":"staleness_check","entities":["Linear","Jira"],"time_reference":"last Monday","original_topic":"project management tools pricing"}`;

export function createLLMProvider(
  provider: LLMProvider,
  apiKey: string,
  model: string,
): AnthropicProvider | OpenAIProvider {
  if (provider === "anthropic") return new AnthropicProvider(apiKey, model);
  return new OpenAIProvider(apiKey, model);
}

export async function classifyQuery(
  provider: AnthropicProvider | OpenAIProvider,
  message: string,
  history: { role: string; content: string }[],
): Promise<ClassificationResult> {
  return provider.classifyQuery(message, history);
}
