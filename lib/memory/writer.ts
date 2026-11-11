import { createServerClient } from "@/lib/supabase/client";
import type { Message, QueryType, SearchResult, ChangeDiff } from "@/lib/supabase/types";

export interface SaveMessageParams {
  sessionId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  queryType?: QueryType;
  entities?: string[];
  searchQueries?: string[];
  searchResults?: SearchResult[];
  changeDiff?: ChangeDiff;
  embedding?: number[] | null;
}

/**
 * Ensure a conversation row exists for this session.
 * If not found, creates one with an auto-generated title from the first message.
 */
async function ensureConversation(
  supabase: ReturnType<typeof createServerClient>,
  conversationId: string,
  sessionId: string,
  firstMessageContent: string,
): Promise<void> {
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!data) {
    const title =
      firstMessageContent.length > 50
        ? firstMessageContent.slice(0, 50) + "..."
        : firstMessageContent;

    const { error } = await supabase.from("conversations").insert({
      id: conversationId,
      user_session_id: sessionId,
      title,
    });

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }
}

/** Persist a message (user or assistant) to Supabase. Always throws on failure. */
export async function saveMessage(params: SaveMessageParams): Promise<Message> {
  const {
    sessionId,
    conversationId,
    role,
    content,
    queryType,
    entities,
    searchQueries,
    searchResults,
    changeDiff,
    embedding,
  } = params;

  const supabase = createServerClient();

  // For user messages, make sure the parent conversation row exists
  if (role === "user") {
    await ensureConversation(supabase, conversationId, sessionId, content);
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_session_id: sessionId,
      role,
      content,
      query_type: queryType ?? null,
      entities: entities ?? null,
      search_queries: searchQueries ?? null,
      search_results: searchResults ? JSON.stringify(searchResults) : null,
      change_diff: changeDiff ? JSON.stringify(changeDiff) : null,
      embedding: embedding ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }

  // Also bump the conversation's updated_at so sidebar ordering stays correct
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data as Message;
}

/** Create or replace the pinned context for a session. */
export async function upsertPinnedContext(
  sessionId: string,
  context: string,
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase.from("pinned_context").upsert(
    {
      user_session_id: sessionId,
      context,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_session_id" },
  );

  if (error) {
    throw new Error(`Failed to upsert pinned context: ${error.message}`);
  }
}
