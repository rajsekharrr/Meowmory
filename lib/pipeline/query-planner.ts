import type { QueryType } from "@/lib/supabase/types";
import type { Message } from "@/lib/supabase/types";
import type { SearchPlan } from "./search";

export interface PipelineContext {
  query_type: QueryType;
  user_message: string;
  entities: string[];
  time_reference: string | null;
  original_topic: string;
  past_messages: Message[];
  pinned_context: string | null;
}

export function buildSearchPlan(ctx: PipelineContext): SearchPlan {
  const { query_type, user_message, entities, original_topic, past_messages } =
    ctx;

  switch (query_type) {
    case "new_query": {
      // 1-2 queries: topic-based, no freshness pressure
      const queries = [{ query: user_message, entity_tag: null, freshness: false }];
      if (original_topic && original_topic !== user_message) {
        queries.push({ query: original_topic, entity_tag: null, freshness: false });
      }
      return { queries };
    }

    case "recall_query": {
      // Check whether the message also asks for current info
      const wantsCurrentInfo = /current|latest|now|today|still|updated/i.test(
        user_message,
      );
      if (!wantsCurrentInfo) return { queries: [] };
      return {
        queries: [{ query: original_topic || user_message, entity_tag: null, freshness: true }],
      };
    }

    case "staleness_check": {
      // Re-run the original search plus entity-specific queries, all with freshness
      const originalQuery = (() => {
        const ref = past_messages.find(
          (m) => m.search_queries && m.search_queries.length > 0,
        );
        return ref?.search_queries?.[0] ?? original_topic ?? user_message;
      })();

      const queries: SearchPlan["queries"] = [
        { query: originalQuery, entity_tag: null, freshness: true },
      ];
      for (const entity of entities) {
        queries.push({
          query: `${entity} pricing features 2025`,
          entity_tag: entity,
          freshness: true,
        });
      }
      return { queries };
    }

    case "multi_entity": {
      // One query per entity, all with freshness
      const queries: SearchPlan["queries"] = entities.map((entity) => ({
        query: `${entity} pricing features 2025`,
        entity_tag: entity,
        freshness: true,
      }));
      // Fallback if entity extraction was empty
      if (queries.length === 0) {
        queries.push({ query: user_message, entity_tag: null, freshness: true });
      }
      return { queries };
    }
  }
}

