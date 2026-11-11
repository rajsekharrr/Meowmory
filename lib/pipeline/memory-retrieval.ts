import { createServerClient } from "@/lib/supabase/client";
import type { Message, QueryType } from "@/lib/supabase/types";

export interface RetrievalContext {
  query_type: QueryType;
  time_reference: string | null;
  original_topic: string;
  entities: string[];
}

export async function retrieveRelevantMemory(
  sessionId: string,
  ctx: RetrievalContext,
  _userTimezone: string,
  embeddingVector: number[] | null,
): Promise<{ past_messages: Message[]; pinned_context: string | null }> {
  const supabase = createServerClient();

  // 1. Always fetch pinned context first
  let pinned_context: string | null = null;
  {
    const { data } = await supabase
      .from("pinned_context")
      .select("context")
      .eq("user_session_id", sessionId)
      .maybeSingle();
    pinned_context = data?.context ?? null;
  }

  let past_messages: Message[] = [];

  const baseQuery = () =>
    supabase
      .from("messages")
      .select("*")
      .eq("user_session_id", sessionId);

  switch (ctx.query_type) {
    case "recall_query": {
      if (ctx.time_reference) {
        // Exact SQL date range query — parse the natural-language reference
        const { start, end } = parseDateRange(ctx.time_reference, _userTimezone);
        const { data } = await baseQuery()
          .eq("role", "user")
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false })
          .limit(10);
        past_messages = (data as Message[]) ?? [];
      } else if (embeddingVector) {
        // Semantic search via pgvector cosine distance
        const { data } = await supabase.rpc("match_messages", {
          query_embedding: embeddingVector,
          session_id: sessionId,
          match_count: 5,
        });
        past_messages = (data as Message[]) ?? [];
      } else {
        // Keyword fallback on content
        const { data } = await baseQuery()
          .eq("role", "user")
          .or(`content.ilike.%${ctx.original_topic}%`)
          .order("created_at", { ascending: false })
          .limit(10);
        past_messages = (data as Message[]) ?? [];
      }
      break;
    }

    case "staleness_check": {
      // Find the most recent user message with matching entities or similar content
      const { data } = await baseQuery()
        .eq("role", "user")
        .or(
          [
            `content.ilike.%${ctx.original_topic}%`,
            ...ctx.entities.map((e) => `content.ilike.%${e}%`),
          ].join(","),
        )
        .order("created_at", { ascending: false })
        .limit(5);
      past_messages = (data as Message[]) ?? [];
      break;
    }

    case "multi_entity": {
      // Find the message that originally listed these entities — match any entity
      const entityFilter = ctx.entities
        .map((e) => `entities.cs.{${e}}`)
        .join(",");
      const { data } = await baseQuery()
        .eq("role", "user")
        .or(entityFilter)
        .order("created_at", { ascending: false })
        .limit(5);
      past_messages = (data as Message[]) ?? [];
      break;
    }

    case "new_query": {
      // Semantic search for related past questions (context enrichment), limit 3
      if (embeddingVector) {
        const { data } = await supabase.rpc("match_messages", {
          query_embedding: embeddingVector,
          session_id: sessionId,
          match_count: 3,
        });
        past_messages = (data as Message[]) ?? [];
      } else {
        const { data } = await baseQuery()
          .eq("role", "user")
          .or(`content.ilike.%${ctx.original_topic}%`)
          .order("created_at", { ascending: false })
          .limit(3);
        past_messages = (data as Message[]) ?? [];
      }
      break;
    }
  }

  // Deduplicate by message ID, sort by created_at desc, limit 10
  const seen = new Set<string>();
  const deduped: Message[] = [];
  for (const m of past_messages) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      deduped.push(m);
    }
  }
  deduped.sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );

  return { past_messages: deduped.slice(0, 10), pinned_context };
}

// Parse a natural-language date reference into a UTC day range.
// Conservative: unknown references fall back to a wide window so recall still returns results.
function parseDateRange(
  reference: string,
  _userTimezone: string,
): { start: string; end: string } {
  const ref = reference.toLowerCase().trim();
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setUTCHours(23, 59, 59, 999);
    return x;
  };

  const today = new Date(now);
  const iso = (d: Date) => d.toISOString();

  // Relative keywords
  if (ref === "today" || ref === "this morning") {
    return { start: iso(startOfDay(today)), end: iso(endOfDay(today)) };
  }
  if (ref === "yesterday") {
    const y = new Date(today);
    y.setUTCDate(y.getUTCDate() - 1);
    return { start: iso(startOfDay(y)), end: iso(endOfDay(y)) };
  }
  if (ref === "last week" || ref === "last 7 days") {
    const s = new Date(today);
    s.setUTCDate(s.getUTCDate() - 7);
    return { start: iso(startOfDay(s)), end: iso(endOfDay(today)) };
  }
  if (ref.startsWith("last ")) {
    // "last Tuesday", "last Monday", etc.
    const dayName = ref.slice(5).trim();
    const idx = weekdayIndex(dayName);
    if (idx !== null) {
      const todayIdx = today.getUTCDay();
      let diff = todayIdx - idx;
      if (diff <= 0) diff += 7;
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - diff);
      return { start: iso(startOfDay(d)), end: iso(endOfDay(d)) };
    }
  }
  // Bare weekday name, e.g. "Monday"
  const bare = weekdayIndex(ref);
  if (bare !== null) {
    const todayIdx = today.getUTCDay();
    let diff = todayIdx - bare;
    if (diff <= 0) diff += 7;
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - diff);
    return { start: iso(startOfDay(d)), end: iso(endOfDay(d)) };
  }
  // "November 3" / "3 November" / "Nov 3" — infer current or past year
  const monthDay = parseMonthDay(ref);
  if (monthDay) {
    const year = today.getUTCFullYear();
    let d = new Date(Date.UTC(year, monthDay.month, monthDay.day));
    if (d > today) d = new Date(Date.UTC(year - 1, monthDay.month, monthDay.day));
    return { start: iso(startOfDay(d)), end: iso(endOfDay(d)) };
  }
  // ISO date passthrough
  if (/^\d{4}-\d{2}-\d{2}/.test(ref)) {
    const d = new Date(ref);
    if (!isNaN(d.getTime())) {
      return { start: iso(startOfDay(d)), end: iso(endOfDay(d)) };
    }
  }

  // Fallback: wide recent window so recall still surfaces candidates
  const s = new Date(today);
  s.setUTCDate(s.getUTCDate() - 30);
  return { start: iso(startOfDay(s)), end: iso(endOfDay(today)) };
}

function weekdayIndex(name: string): number | null {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const n = name.toLowerCase();
  const idx = days.findIndex((d) => d.startsWith(n) || n.startsWith(d));
  return idx === -1 ? null : idx;
}

function parseMonthDay(
  ref: string,
): { month: number; day: number } | null {
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  // "November 3" / "Nov 3"
  let m = ref.match(/([a-z]+)\s+(\d{1,2})/i);
  if (m) {
    const monthIdx = months.findIndex((mn) => mn.startsWith(m![1].toLowerCase()));
    if (monthIdx !== -1) {
      const day = parseInt(m[2], 10);
      if (day >= 1 && day <= 31) return { month: monthIdx, day };
    }
  }
  // "3 November"
  m = ref.match(/(\d{1,2})\s+([a-z]+)/i);
  if (m) {
    const monthIdx = months.findIndex((mn) => mn.startsWith(m![2].toLowerCase()));
    if (monthIdx !== -1) {
      const day = parseInt(m[1], 10);
      if (day >= 1 && day <= 31) return { month: monthIdx, day };
    }
  }
  return null;
}

