"use client";

import { useEffect, useRef } from "react";
import type { SearchResult } from "@/lib/supabase/types";
import type { ChatMessage } from "@/hooks/useChat";
import { Message } from "./Message";
import { CatLoader } from "@/components/ui/CatLoader";

interface MessageListProps {
  messages: ChatMessage[];
  status: string | null;
  isLoading: boolean;
  sources: SearchResult[];
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
      <svg
        width="40" height="40" viewBox="0 0 40 40" fill="none"
        aria-hidden="true"
        style={{ color: "var(--border)" }}
      >
        {/* minimal sitting cat outline */}
        <ellipse cx="20" cy="28" rx="10" ry="7" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="20" cy="16" rx="8" ry="8" stroke="currentColor" strokeWidth="1.5" />
        {/* ears */}
        <path d="M13 10l-3-5 4 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M27 10l3-5-4 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {/* eyes */}
        <circle cx="17" cy="16" r="1.2" fill="currentColor" />
        <circle cx="23" cy="16" r="1.2" fill="currentColor" />
      </svg>
      <p className="text-sm text-[var(--text-muted)]">Ask me anything. I&apos;ll remember it.</p>
    </div>
  );
}

export function MessageList({ messages, status, isLoading, sources }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-4 max-w-3xl mx-auto">
        {messages.map((msg, i) => (
          <Message
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
            sources={msg.role === "assistant" ? sources : undefined}
          />
        ))}

        {isLoading && status && (
          <div className="pl-1">
            <CatLoader text={status} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
