"use client";

import { useState } from "react";
import type { SearchResult } from "@/lib/supabase/types";

interface SourcesProps {
  sources: SearchResult[];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function Sources({ sources }: SourcesProps) {
  const [open, setOpen] = useState(false);

  if (!sources.length) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {sources.length} {sources.length === 1 ? "source" : "sources"}
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none"
          aria-hidden="true"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
        >
          <path d="M1 2.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="mt-2 rounded-md border border-[var(--border)] overflow-y-auto"
          style={{ maxHeight: 200 }}
        >
          {sources.map((s, i) => {
            const domain = getDomain(s.url);
            return (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--bg-subtle)] transition-colors group"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                  alt=""
                  width={14}
                  height={14}
                  className="shrink-0 rounded-sm"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-[var(--text)] truncate leading-tight">
                    {s.title}
                  </span>
                  <span className="block text-xs text-[var(--text-muted)] truncate leading-tight">
                    {domain}
                    {s.published_date ? ` · ${formatDate(s.published_date)}` : ""}
                  </span>
                </span>
                {/* external link icon */}
                <svg
                  width="10" height="10" viewBox="0 0 10 10" fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <path d="M4 2H2v6h6V6M6 2h2v2M8 2L5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
