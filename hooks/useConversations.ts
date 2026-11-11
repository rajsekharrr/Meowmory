"use client";

import { useState, useEffect, useCallback } from "react";
import type { Conversation } from "@/lib/supabase/types";

export interface ConversationWithPreview extends Conversation {
  lastMessage?: string;
}

interface GroupedConversations {
  today: ConversationWithPreview[];
  yesterday: ConversationWithPreview[];
  older: ConversationWithPreview[];
}

function groupConversations(convs: ConversationWithPreview[]): GroupedConversations {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const today: ConversationWithPreview[] = [];
  const yesterday: ConversationWithPreview[] = [];
  const older: ConversationWithPreview[] = [];

  for (const c of convs) {
    const d = new Date(c.updated_at);
    if (d >= todayStart) today.push(c);
    else if (d >= yesterdayStart) yesterday.push(c);
    else older.push(c);
  }

  return { today, yesterday, older };
}

export function useConversations(sessionId: string) {
  const [conversations, setConversations] = useState<ConversationWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        headers: { "x-session-id": sessionId },
      });
      if (!res.ok) throw new Error(`Failed to load conversations (${res.status})`);
      const data = (await res.json()) as ConversationWithPreview[];
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /**
   * Create a new conversation locally (optimistic) and return its ID.
   * The conversation row is actually created by the chat route on first message.
   */
  const createNew = useCallback((): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const optimistic: ConversationWithPreview = {
      id,
      user_session_id: sessionId,
      title: "New conversation",
      created_at: now,
      updated_at: now,
    };
    setConversations((prev) => [optimistic, ...prev]);
    return id;
  }, [sessionId]);

  return {
    conversations,
    grouped: groupConversations(conversations),
    loading,
    error,
    refetch: fetchConversations,
    createNew,
  };
}
