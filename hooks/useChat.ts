"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Message, SearchResult, ChangeDiff } from "@/lib/supabase/types";
import type { Settings } from "./useSettings";

export interface ChatMessage extends Omit<Message, "embedding"> {
  isStreaming?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  status: string | null;
  isLoading: boolean;
  error: string | null;
  sources: SearchResult[];
  diff: ChangeDiff | null;
}

const INITIAL_STATE: ChatState = {
  messages: [],
  status: null,
  isLoading: false,
  error: null,
  sources: [],
  diff: null,
};

function parseSseChunk(chunk: string): object[] {
  return chunk
    .split("\n\n")
    .flatMap((block) =>
      block
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => {
          try {
            return JSON.parse(line.slice(6));
          } catch {
            return null;
          }
        }),
    )
    .filter(Boolean) as object[];
}

export function useChat(initialConversationId: string | null) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [state, setState] = useState<ChatState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  // Load existing messages when a conversationId is provided on mount
  useEffect(() => {
    if (!conversationId) return;
    // sessionId not available here — caller passes it; skip pre-load
    // (ChatWindow should load messages itself via a separate fetch if needed)
  }, [conversationId]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const sendMessage = useCallback(
    async (content: string, settings: Settings, sessionId: string) => {
      if (!content.trim() || !sessionId) return;

      // Cancel any in-flight stream
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conversationId ?? "",
        user_session_id: sessionId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
        query_type: null,
        entities: null,
        search_queries: null,
        search_results: null,
        change_diff: null,
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conversationId ?? "",
        user_session_id: sessionId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        query_type: null,
        entities: null,
        search_queries: null,
        search_results: null,
        change_diff: null,
        isStreaming: true,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg, assistantMsg],
        isLoading: true,
        status: null,
        error: null,
        sources: [],
        diff: null,
      }));

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": settings.apiKey,
            "x-provider": settings.provider,
            "x-model": settings.model,
            "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
            "x-session-id": sessionId,
          },
          body: JSON.stringify({
            message: content,
            conversationId,
            sessionId,
            provider: settings.provider,
            model: settings.model,
          }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          const msg =
            typeof json.error === "string"
              ? json.error
              : `Request failed (${res.status})`;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            status: null,
            error: msg,
            messages: prev.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, isStreaming: false } : m,
            ),
          }));
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE blocks (separated by \n\n)
          const blocks = buffer.split("\n\n");
          // Keep the last (possibly incomplete) block in the buffer
          buffer = blocks.pop() ?? "";

          const events = parseSseChunk(blocks.join("\n\n"));

          for (const event of events) {
            const e = event as Record<string, unknown>;

            if (e.type === "status") {
              setState((prev) => ({ ...prev, status: e.content as string }));
            } else if (e.type === "delta") {
              const chunk = e.content as string;
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + chunk }
                    : m,
                ),
              }));
            } else if (e.type === "sources") {
              setState((prev) => ({
                ...prev,
                sources: (e.sources as SearchResult[]) ?? [],
              }));
            } else if (e.type === "diff") {
              const diff = e.diff as ChangeDiff;
              setState((prev) => ({
                ...prev,
                diff,
                messages: prev.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, change_diff: diff }
                    : m,
                ),
              }));
            } else if (e.type === "done") {
              const newConvId = e.conversationId as string | undefined;
              if (newConvId) setConversationId(newConvId);
              setState((prev) => ({
                ...prev,
                isLoading: false,
                status: null,
                messages: prev.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false } : m,
                ),
              }));
            } else if (e.type === "error") {
              setState((prev) => ({
                ...prev,
                isLoading: false,
                status: null,
                error: (e.content as string) ?? "something spooked the cat. try again.",
                messages: prev.messages.map((m) =>
                  m.id === assistantMsg.id ? { ...m, isStreaming: false } : m,
                ),
              }));
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[useChat] stream error:", err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          status: null,
          error: "connection lost. try again.",
          messages: prev.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, isStreaming: false } : m,
          ),
        }));
      }
    },
    [conversationId],
  );

  return { state, sendMessage, clearError, conversationId };
}
