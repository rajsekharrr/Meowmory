"use client";

import type { ChangeDiff, ChangeItem } from "@/lib/supabase/types";

interface ChangeDiffProps {
  diff: ChangeDiff;
}

interface SectionProps {
  items: ChangeItem[];
  symbol: string;
  label: string;
  bgStyle: React.CSSProperties;
  dotColor: string;
}

function Section({ items, symbol, label, bgStyle, dotColor }: SectionProps) {
  if (!items.length) return null;
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-mono" style={{ color: dotColor }}>{symbol}</span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: dotColor }}>{label}</span>
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded px-2.5 py-1.5 mb-1 last:mb-0"
          style={bgStyle}
        >
          <span className="text-sm font-medium text-[var(--text)]">{item.entity}</span>
          {" "}
          <span className="text-sm text-[var(--text-muted)]">{item.description}</span>
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 text-xs underline underline-offset-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              source ↗
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export function ChangeDiff({ diff }: ChangeDiffProps) {
  const total =
    diff.changed.length +
    diff.new_items.length +
    diff.removed.length +
    diff.unchanged.length;

  if (total === 0) return null;

  return (
    <div
      className="mt-3 rounded-md p-3"
      style={{ border: "1px solid var(--border)" }}
    >
      <p className="text-sm font-medium text-[var(--text)] mb-2.5">What changed</p>

      <Section
        items={diff.changed}
        symbol="✦"
        label="Changed"
        dotColor="var(--accent)"
        bgStyle={{ backgroundColor: "rgba(45,106,79,0.08)" }}
      />
      <Section
        items={diff.new_items}
        symbol="+"
        label="New"
        dotColor="var(--accent)"
        bgStyle={{ backgroundColor: "rgba(45,106,79,0.05)" }}
      />
      <Section
        items={diff.removed}
        symbol="−"
        label="Removed"
        dotColor="var(--removed)"
        bgStyle={{ backgroundColor: "rgba(155,29,29,0.07)" }}
      />
      <Section
        items={diff.unchanged}
        symbol="·"
        label="Same"
        dotColor="var(--text-muted)"
        bgStyle={{}}
      />
    </div>
  );
}
