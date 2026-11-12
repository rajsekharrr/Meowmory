"use client";

const MAX = 500;

interface PinnedContextProps {
  value: string;
  onChange: (ctx: string) => void;
}

export function PinnedContext({ value, onChange }: PinnedContextProps) {
  const remaining = MAX - value.length;
  const over = remaining < 0;

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX))}
        rows={4}
        placeholder="Tell me about yourself — your role, what you're working on, your team. I'll remember this forever."
        aria-label="Pinned context"
        className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--text-muted)] transition-colors leading-relaxed"
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)] leading-snug">
          This context is included with every message. You never have to repeat yourself.
        </p>
        <span
          className="shrink-0 text-xs font-mono"
          style={{ color: over ? "var(--removed)" : "var(--text-muted)" }}
        >
          {remaining}
        </span>
      </div>
    </div>
  );
}
