import { createServerClient } from "@/lib/supabase/client";
import type { Conversation, Message } from "@/lib/supabase/types";

/** All conversations for a session, most recently updated first. */
export async function getConversations(sessionId: string): Promise<Conversation[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_session_id", sessionId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  return (data ?? []) as Conversation[];
}

/**
 * All messages for a conversation, oldest first.
 * Verifies that the conversation belongs to the given session.
 */
export async function getConversationMessages(
  conversationId: string,
  sessionId: string,
): Promise<Message[]> {
  const supabase = createServerClient();

  // Ownership check — a user must not be able to read another session's messages
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_session_id", sessionId)
    .maybeSingle();

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data ?? []) as Message[];
}

/**
 * pgvector cosine similarity search over stored message embeddings.
 * Only returns messages with similarity > 0.7.
 */
export async function semanticSearch(
  sessionId: string,
  queryEmbedding: number[],
  limit: number,
): Promise<Message[]> {
  const supabase = createServerClient();

  // match_messages is a Supabase RPC function that wraps the vector distance query
  const { data, error } = await supabase.rpc("match_messages", {
    query_embedding: queryEmbedding,
    session_id: sessionId,
    match_count: limit,
  });

  if (error) {
    throw new Error(`Semantic search failed: ${error.message}`);
  }

  // Filter out low-confidence matches
  return ((data ?? []) as (Message & { similarity: number })[])
    .filter((m) => m.similarity > 0.7);
}

/**
 * Exact date-range search — used for recall_query with a resolved time reference.
 * Returns up to 10 user messages within [start, end), newest first.
 */
export async function exactDateSearch(
  sessionId: string,
  start: Date,
  end: Date,
): Promise<Message[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_session_id", sessionId)
    .eq("role", "user")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Date search failed: ${error.message}`);
  }

  return (data ?? []) as Message[];
}

/** Returns the user's pinned context text, or null if none is set. */
export async function getPinnedContext(sessionId: string): Promise<string | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("pinned_context")
    .select("context")
    .eq("user_session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch pinned context: ${error.message}`);
  }

  return data?.context ?? null;
}
