"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useSession } from "@/hooks/useSession";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { CatLogo } from "@/components/ui/CatLogo";

interface ConversationPageProps {
  params: { id: string };
}

export default function ConversationPage({ params }: ConversationPageProps) {
  const { hasKey } = useSettings();
  const { sessionId } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sessionId && !hasKey) {
      setSettingsOpen(true);
    }
  }, [sessionId, hasKey]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-40 md:hidden">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header — 56px */}
        <header
          className="shrink-0 flex items-center justify-between px-4 h-14"
          style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)" }}
        >
          <div className="flex items-center gap-2">
            <button
              className="md:hidden p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <CatLogo width={22} height={22} className="text-[var(--accent)]" />
            <span className="text-sm font-medium tracking-[-0.01em]" style={{ color: "var(--text)" }}>
              Meowmory
            </span>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: "var(--text-muted)" }}
            aria-label="Open settings"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1.1 1.1M10.3 10.3l1.1 1.1M10.3 2.6l-1.1 1.1M3.7 10.3l-1.1 1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Settings
          </button>
        </header>

        <div className="flex-1 min-h-0">
          <ChatWindow
            conversationId={params.id}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
