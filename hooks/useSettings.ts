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

/** Returns "sk-...XXXX" — last 4 chars visible, rest masked. */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return key;
  const last4 = key.slice(-4);
  const prefix = key.startsWith("sk-ant-") ? "sk-ant-" : "sk-";
  return `${prefix}...${last4}`;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(readSettings);

  // Sync to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem(KEYS.apiKey, settings.apiKey);
    localStorage.setItem(KEYS.provider, settings.provider);
    localStorage.setItem(KEYS.model, settings.model);
    localStorage.setItem(KEYS.pinnedContext, settings.pinnedContext);
  }, [settings]);

  const updateApiKey = useCallback((apiKey: string) => {
    setSettings((prev) => ({ ...prev, apiKey }));
  }, []);

  const updateProvider = useCallback((provider: Settings["provider"]) => {
    // Auto-switch to that provider's default model
    setSettings((prev) => ({
      ...prev,
      provider,
      model: DEFAULT_MODELS[provider],
    }));
  }, []);

  const updateModel = useCallback((model: string) => {
    setSettings((prev) => ({ ...prev, model }));
  }, []);

  const updatePinnedContext = useCallback((pinnedContext: string) => {
    setSettings((prev) => ({ ...prev, pinnedContext }));
  }, []);

  const clearApiKey = useCallback(() => {
    setSettings((prev) => ({ ...prev, apiKey: "" }));
  }, []);

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
