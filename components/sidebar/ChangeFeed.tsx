"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import type { Message } from "@/lib/supabase/types";

interface ChangeSummary {
  messageId: string;
  conversationId: string;
  entity: string;
  createdAt: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

export function ChangeFeed() {
  const { sessionId } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ChangeSummary[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    async function load() {
      try {
        const res = await fetch(`/api/memory/changes?sessionId=${sessionId}&limit=20`);
        if (!res.ok) return;
        const data = (await res.json()) as Message[];
        const summaries: ChangeSummary[] = data.flatMap((msg) => {
          if (!msg.change_diff) return [];
          // Use first changed/new/removed entity as the label
          const first =
            msg.change_diff.changed[0] ??
            msg.change_diff.new_items[0] ??
            msg.change_diff.removed[0];
          if (!first) return [];
          return [{
            messageId: msg.id,
            conversationId: msg.conversation_id,
            entity: first.entity,
            createdAt: msg.created_at,
          }];
        });
        setItems(summaries);
      } catch {
        // silent — change feed is non-critical
      }
    }

    load();
  }, [sessionId]);

  return (
    <div className="px-3 pb-3">
      <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        Recent changes
      </p>

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No changes tracked yet
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.messageId}>
              <button
                onClick={() => router.push(`/chat/${item.conversationId}`)}
                className="w-full text-left text-xs rounded px-1.5 py-1 hover:bg-[var(--bg-subtle)] transition-colors"
                style={{ color: "var(--text)" }}
              >
                <span className="font-medium">{item.entity}</span>
                <span style={{ color: "var(--text-muted)" }}> changed · {relativeTime(item.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
