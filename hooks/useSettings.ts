"use client";

import { useState, useEffect, useCallback } from "react";

export interface Settings {
  apiKey: string;
  provider: "anthropic" | "openai";
  model: string;
  pinnedContext: string;
}

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

const KEYS = {
  apiKey: "meowmory_api_key",
  provider: "meowmory_provider",
  model: "meowmory_model",
  pinnedContext: "meowmory_pinned_context",
} as const;

function readSettings(): Settings {
  if (typeof window === "undefined") {
    return { apiKey: "", provider: "anthropic", model: DEFAULT_MODELS.anthropic, pinnedContext: "" };
  }
  const provider = (localStorage.getItem(KEYS.provider) ?? "anthropic") as Settings["provider"];
  return {
    apiKey: localStorage.getItem(KEYS.apiKey) ?? "",
    provider,
    model: localStorage.getItem(KEYS.model) ?? DEFAULT_MODELS[provider],
    pinnedContext: localStorage.getItem(KEYS.pinnedContext) ?? "",
  };
}

function writeSettings(s: Settings) {
  localStorage.setItem(KEYS.apiKey, s.apiKey);
  localStorage.setItem(KEYS.provider, s.provider);
  localStorage.setItem(KEYS.model, s.model);
  localStorage.setItem(KEYS.pinnedContext, s.pinnedContext);
}

/** Returns "sk-...XXXX" — last 4 chars visible, rest masked. */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key;
  const last4 = key.slice(-4);
  const prefix = key.startsWith("sk-ant-") ? "sk-ant-" : "sk-";
  return `${prefix}...${last4}`;
}

// ── Module-level broadcast so all useSettings() instances stay in sync ──
// When one hook writes settings, every other hook instance in the same tab
// receives the update immediately (no context provider needed).
const BROADCAST = "meowmory:settings-updated";

function broadcast() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BROADCAST));
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(readSettings);

  // Re-read from localStorage whenever any hook instance writes
  useEffect(() => {
    const handler = () => setSettings(readSettings());
    window.addEventListener(BROADCAST, handler);
    // also sync when the user updates settings in another tab
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(BROADCAST, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // Write + notify all subscribers atomically
  const commit = useCallback((next: Settings) => {
    writeSettings(next);
    setSettings(next);
    broadcast();
  }, []);

  const updateApiKey = useCallback((apiKey: string) => {
    commit({ ...readSettings(), apiKey });
  }, [commit]);

  const updateProvider = useCallback((provider: Settings["provider"]) => {
    commit({ ...readSettings(), provider, model: DEFAULT_MODELS[provider] });
  }, [commit]);

  const updateModel = useCallback((model: string) => {
    commit({ ...readSettings(), model });
  }, [commit]);

  const updatePinnedContext = useCallback((pinnedContext: string) => {
    commit({ ...readSettings(), pinnedContext });
  }, [commit]);

  const clearApiKey = useCallback(() => {
    commit({ ...readSettings(), apiKey: "" });
  }, [commit]);

  return {
    settings,
    updateApiKey,
    updateProvider,
    updateModel,
    updatePinnedContext,
    clearApiKey,
    hasKey: settings.apiKey.trim().length > 0,
    maskedKey: maskApiKey(settings.apiKey),
  };
}
