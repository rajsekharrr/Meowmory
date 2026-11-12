"use client";

import { useChat } from "@/hooks/useChat";
import { useSettings } from "@/hooks/useSettings";
import { useSession } from "@/hooks/useSession";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface ChatWindowProps {
  conversationId: string | null;
  onOpenSettings?: () => void;
}

export function ChatWindow({ conversationId, onOpenSettings }: ChatWindowProps) {
  const { settings, hasKey } = useSettings();
  const { sessionId } = useSession();
  const { state, sendMessage, clearError } = useChat(conversationId);

  const handleSend = (content: string) => {
    if (!sessionId) return;
    sendMessage(content, settings, sessionId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* No-key banner */}
      {!hasKey && (
        <div
          className="shrink-0 px-4 py-2.5 text-sm text-center"
          style={{
            backgroundColor: "rgba(196,98,45,0.08)",
            borderBottom: "1px solid rgba(196,98,45,0.2)",
            color: "var(--accent-warm)",
          }}
        >
          No API key —{" "}
          <button
            onClick={onOpenSettings}
            className="underline underline-offset-2 hover:opacity-80 transition-opacity font-medium"
          >
            add one in Settings
          </button>{" "}
          to start chatting
        </div>
      )}

      {/* Error banner */}
      {state.error && (
        <div
          className="shrink-0 px-4 py-2 text-sm flex items-center justify-between"
          style={{
            backgroundColor: "rgba(155,29,29,0.07)",
            borderBottom: "1px solid rgba(155,29,29,0.15)",
            color: "var(--removed)",
          }}
        >
          <span>{state.error}</span>
          <button
            onClick={clearError}
            aria-label="Dismiss error"
            className="ml-3 text-xs underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Message thread — takes all available space */}
      <MessageList
        messages={state.messages}
        status={state.status}
        isLoading={state.isLoading}
        sources={state.sources}
      />

      {/* Input — sticky at bottom */}
      <MessageInput
        onSend={handleSend}
        isLoading={state.isLoading}
        hasApiKey={hasKey}
        onOpenSettings={onOpenSettings}
      />
    </div>
  );
}
