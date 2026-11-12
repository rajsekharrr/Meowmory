"use client";

import { useState, useCallback } from "react";
import type { LLMProvider } from "@/lib/supabase/types";
import { maskApiKey } from "@/hooks/useSettings";

interface ApiKeyInputProps {
  value: string;
  onChange: (key: string) => void;
  provider: LLMProvider;
}

function validateKey(key: string, provider: LLMProvider): boolean | null {
  if (!key) return null;
  if (provider === "anthropic") return key.startsWith("sk-ant-");
  return key.startsWith("sk-");
}

export function ApiKeyInput({ value, onChange, provider }: ApiKeyInputProps) {
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);

  const placeholder = provider === "anthropic" ? "sk-ant-..." : "sk-...";
  const validity = touched ? validateKey(value, provider) : null;

  const handleBlur = useCallback(() => setTouched(true), []);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex items-center gap-1 rounded-md border bg-[var(--bg)] px-3 py-2 focus-within:border-[var(--text-muted)] transition-colors"
        style={{
          borderColor:
            validity === true
              ? "var(--accent)"
              : validity === false
              ? "var(--removed)"
              : "var(--border)",
        }}
      >
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-label="API key"
          className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none font-mono"
        />

        {/* validity icon */}
        {validity === true && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Valid" className="shrink-0 text-[var(--accent)]">
            <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {validity === false && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-label="Invalid" className="shrink-0 text-[var(--removed)]">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}

        {/* show/hide toggle */}
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide key" : "Show key"}
          className="shrink-0 ml-1 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          {show ? (
            /* eye-off */
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 1l12 12M5.5 5.6A2 2 0 009.4 9.4M2.5 4.5C1.5 5.5 1 6.5 1 7s2 4 6 4a7.5 7.5 0 002.5-.5M4 2.5C4.9 2.2 5.9 2 7 2c4 0 6 3 6 5 0 .6-.3 1.3-.8 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          ) : (
            /* eye */
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          )}
        </button>
      </div>

      {/* masked preview when key is set */}
      {value && (
        <p className="text-xs text-[var(--text-muted)] font-mono pl-1">
          {maskApiKey(value)}
        </p>
      )}

      {validity === false && (
        <p className="text-xs text-[var(--removed)] pl-1">
          {provider === "anthropic"
            ? 'Anthropic keys start with "sk-ant-"'
            : 'OpenAI keys start with "sk-"'}
        </p>
      )}
    </div>
  );
}
