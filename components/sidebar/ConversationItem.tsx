"use client";

import type { ConversationWithPreview } from "@/hooks/useConversations";

interface ConversationItemProps {
  conversation: ConversationWithPreview;
  isActive: boolean;
  onClick: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-0 text-left rounded-md transition-colors relative overflow-hidden group"
      style={{
        backgroundColor: isActive ? "var(--bg-subtle)" : "transparent",
      }}
    >
      {/* active left bar */}
      <span
        className="shrink-0 self-stretch rounded-l-md transition-all"
        style={{
          width: 3,
          backgroundColor: isActive ? "var(--accent)" : "transparent",
        }}
        aria-hidden="true"
      />

      <span className="flex-1 min-w-0 px-2.5 py-2">
        <span
          className="block text-sm truncate leading-snug"
          style={{ color: isActive ? "var(--text)" : "var(--text)" }}
        >
          {conversation.title ?? "New conversation"}
        </span>
        <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {relativeTime(conversation.updated_at)}
        </span>
      </span>
    </button>
  );
}
