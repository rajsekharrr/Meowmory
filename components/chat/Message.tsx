"use client";

import type { SearchResult } from "@/lib/supabase/types";
import type { ChatMessage } from "@/hooks/useChat";
import { Sources } from "./Sources";
import { ChangeDiff } from "./ChangeDiff";

interface MessageProps {
  message: ChatMessage;
  isLast: boolean;
  sources?: SearchResult[];
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (isToday) return time;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
}

/** Minimal regex-based markdown renderer — bold, inline code, paragraph breaks. */
function renderMarkdown(text: string): React.ReactNode[] {
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pi) => {
    // Split on **bold** and `code` markers
    const parts = para.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    const nodes = parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="bg-[var(--bg-subtle)] px-1 rounded text-sm font-mono"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      // Preserve single newlines as line breaks
      return part.split("\n").map((line, j, arr) => (
        <span key={`${i}-${j}`}>
          {line}
          {j < arr.length - 1 && <br />}
        </span>
      ));
    });

    return (
      <p key={pi} className={pi > 0 ? "mt-3" : ""}>
        {nodes}
      </p>
    );
  });
}

export function Message({ message, isLast, sources }: MessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm text-[var(--text)]"
          style={{ backgroundColor: "var(--bg-subtle)" }}
        >
          <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2 text-right">
            {formatTimestamp(message.created_at)}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-[var(--text)]"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="leading-relaxed">
          {renderMarkdown(message.content)}
          {message.isStreaming && (
            <span
              className="inline-block ml-0.5 align-middle"
              style={{
                width: 1,
                height: "1em",
                backgroundColor: "var(--accent)",
                animation: "blink 1s step-start infinite",
              }}
              aria-hidden="true"
            />
          )}
        </div>

        {sources && sources.length > 0 && <Sources sources={sources} />}
        {message.change_diff && <ChangeDiff diff={message.change_diff} />}

        {!message.isStreaming && (
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {formatTimestamp(message.created_at)}
          </p>
        )}
      </div>
    </div>
  );
}
