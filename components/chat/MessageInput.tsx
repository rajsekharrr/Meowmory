"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  hasApiKey: boolean;
  onOpenSettings?: () => void;
}

export function MessageInput({
  onSend,
  isLoading,
  hasApiKey,
  onOpenSettings,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to 5 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24; // px, matches text-sm leading-relaxed
    const maxHeight = lineHeight * 5 + 24; // 5 lines + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || !hasApiKey) return;
    onSend(trimmed);
    setValue("");
  }, [value, isLoading, hasApiKey, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  }, []);

  const canSend = value.trim().length > 0 && !isLoading && hasApiKey;
  const showCharCount = value.length > 500;

  const placeholder = hasApiKey
    ? "Ask anything — I'll remember it."
    : "Add your API key in settings to start";

  return (
    <div
      className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3"
      style={{ minHeight: 80 }}
    >
      <div
        className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 focus-within:border-[var(--text-muted)] transition-colors"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={!hasApiKey ? onOpenSettings : undefined}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          aria-label="Message input"
          className={[
            "flex-1 resize-none bg-transparent text-sm text-[var(--text)]",
            "placeholder:text-[var(--text-muted)] outline-none leading-relaxed",
            "disabled:opacity-50",
            !hasApiKey ? "cursor-pointer" : "",
          ].join(" ")}
          style={{ minHeight: 24 }}
        />

        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          className={[
            "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            "focus:outline focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-1",
            canSend
              ? "bg-[var(--accent)] text-white hover:opacity-90 active:opacity-80"
              : "bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed",
          ].join(" ")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 11.5V2.5M7 2.5L3 6.5M7 2.5l4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showCharCount && (
        <p className="mt-1 text-right text-xs text-[var(--text-muted)] pr-1">
          {value.length} chars
        </p>
      )}
    </div>
  );
}
