"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useConversations } from "@/hooks/useConversations";
import { ConversationItem } from "./ConversationItem";
import { ChangeFeed } from "./ChangeFeed";
import { SettingsModal } from "@/components/settings/SettingsModal";
import type { ConversationWithPreview } from "@/hooks/useConversations";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function GroupLabel({ label }: { label: string }) {
  return (
    <p className="text-xs uppercase tracking-wide px-3 py-1 mt-2 first:mt-0" style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
  );
}

function ConversationGroup({
  label,
  items,
  activeId,
  onSelect,
}: {
  label: string;
  items: ConversationWithPreview[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <GroupLabel label={label} />
      {items.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeId}
          onClick={() => onSelect(conv.id)}
        />
      ))}
    </div>
  );
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionId } = useSession();
  const { grouped, createNew } = useConversations(sessionId);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Extract active conversation id from pathname: /chat/[id]
  const activeId = pathname.startsWith("/chat/")
    ? pathname.replace("/chat/", "").split("/")[0]
    : null;

  const handleNewChat = () => {
    const id = createNew();
    router.push(`/chat/${id}`);
    onClose?.();
  };

  const handleSelect = (id: string) => {
    router.push(`/chat/${id}`);
    onClose?.();
  };

  return (
    <>
      {/* Sidebar panel */}
      <aside
        className="flex flex-col h-full bg-[var(--bg-subtle)] overflow-hidden transition-transform"
        style={{
          width: 240,
          borderRight: "1px solid var(--border)",
          // Mobile: overlay drawer controlled by isOpen
          ...(typeof window !== "undefined" && window.innerWidth < 768
            ? {
                position: "fixed",
                inset: "0 auto 0 0",
                zIndex: 40,
                transform: isOpen ? "translateX(0)" : "translateX(-100%)",
              }
            : {}),
        }}
        aria-label="Sidebar"
      >
        {/* Logo area */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 h-14"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ color: "var(--accent)" }}>
            <ellipse cx="10" cy="13" rx="6" ry="4" stroke="currentColor" strokeWidth="1.4" />
            <ellipse cx="10" cy="8" rx="5" ry="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M6 5.5L4 2l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M14 5.5L16 2l-2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="0.9" fill="currentColor" />
            <circle cx="12" cy="8" r="0.9" fill="currentColor" />
          </svg>
          <span className="text-sm font-medium tracking-[-0.01em]" style={{ color: "var(--text)" }}>
            Meowmory
          </span>
        </div>

        {/* New chat button */}
        <div className="shrink-0 px-3 py-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-1.5 rounded-md py-2 text-sm transition-colors hover:bg-[var(--bg)] active:opacity-80"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-1 py-1">
          <ConversationGroup label="Today"     items={grouped.today}     activeId={activeId} onSelect={handleSelect} />
          <ConversationGroup label="Yesterday" items={grouped.yesterday} activeId={activeId} onSelect={handleSelect} />
          <ConversationGroup label="Older"     items={grouped.older}     activeId={activeId} onSelect={handleSelect} />

          {grouped.today.length === 0 && grouped.yesterday.length === 0 && grouped.older.length === 0 && (
            <p className="text-xs px-3 py-4" style={{ color: "var(--text-muted)" }}>
              No conversations yet
            </p>
          )}
        </div>

        {/* Divider + change feed */}
        <div className="shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="py-3">
            <ChangeFeed />
          </div>
        </div>

        {/* Bottom: settings */}
        <div
          className="shrink-0 px-3 py-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 px-2 py-2 rounded-md w-full text-sm transition-colors hover:bg-[var(--bg)]"
            style={{ color: "var(--text-muted)" }}
            aria-label="Open settings"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M11 2.9l-1.1 1.1M4 11l-1.1 1.1"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
              />
            </svg>
            Settings
          </button>
        </div>
      </aside>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
