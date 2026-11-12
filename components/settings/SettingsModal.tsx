"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiKeyInput } from "./ApiKeyInput";
import { PinnedContext } from "./PinnedContext";
import { useSettings } from "@/hooks/useSettings";
import { useToast } from "@/components/ui/Toast";
import type { LLMProvider } from "@/lib/supabase/types";

const MODELS: Record<LLMProvider, { id: string; label: string; recommended?: boolean }[]> = {
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", recommended: true },
    { id: "claude-haiku-3-5", label: "Claude Haiku 3.5 (faster)" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o", recommended: true },
    { id: "gpt-4o-mini", label: "GPT-4o Mini (faster)" },
  ],
};

const PROVIDER_LINKS: Record<LLMProvider, { label: string; href: string }> = {
  anthropic: { label: "Get Anthropic key →", href: "https://console.anthropic.com" },
  openai:    { label: "Get OpenAI key →",    href: "https://platform.openai.com" },
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateApiKey, updateProvider, updateModel, updatePinnedContext } = useSettings();
  const { show: showToast } = useToast();

  // Local draft state — only commit on Save
  const [draftProvider, setDraftProvider] = useState<LLMProvider>(settings.provider);
  const [draftKey, setDraftKey]           = useState(settings.apiKey);
  const [draftModel, setDraftModel]       = useState(settings.model);
  const [draftCtx, setDraftCtx]           = useState(settings.pinnedContext);
  const [confirmClear, setConfirmClear]   = useState(false);

  const handleProviderSwitch = (p: LLMProvider) => {
    setDraftProvider(p);
    // reset model to that provider's default when switching
    setDraftModel(MODELS[p][0].id);
  };

  const handleSave = () => {
    updateProvider(draftProvider);
    updateApiKey(draftKey);
    updateModel(draftModel);
    updatePinnedContext(draftCtx);
    showToast("Settings saved", "success");
    onClose();
  };

  const handleClearData = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    // Clear all meowmory keys from localStorage
    Object.keys(localStorage)
      .filter((k) => k.startsWith("meowmory_"))
      .forEach((k) => localStorage.removeItem(k));
    showToast("All data cleared", "info");
    onClose();
  };

  const providerLink = PROVIDER_LINKS[draftProvider];
  const modelOptions = MODELS[draftProvider];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-5">

        {/* A. AI Provider */}
        <section>
          <Label>AI Provider</Label>
          <div className="flex gap-2 mt-1.5">
            {(["anthropic", "openai"] as LLMProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => handleProviderSwitch(p)}
                className="flex-1 py-2 rounded-md text-sm font-medium capitalize transition-all"
                style={{
                  border: draftProvider === p
                    ? "2px solid var(--accent)"
                    : "1px solid var(--border)",
                  color: draftProvider === p ? "var(--accent)" : "var(--text-muted)",
                  backgroundColor: draftProvider === p ? "rgba(45,106,79,0.06)" : "var(--bg)",
                }}
              >
                {p === "anthropic" ? "Anthropic" : "OpenAI"}
              </button>
            ))}
          </div>
        </section>

        {/* B. API Key */}
        <section>
          <Label>API Key</Label>
          <div className="mt-1.5">
            <ApiKeyInput value={draftKey} onChange={setDraftKey} provider={draftProvider} />
          </div>
          <a
            href={providerLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-xs text-[var(--text-muted)] underline underline-offset-2 hover:text-[var(--text)] transition-colors"
          >
            {providerLink.label}
          </a>
        </section>

        {/* C. Model */}
        <section>
          <Label>Model</Label>
          <select
            value={draftModel}
            onChange={(e) => setDraftModel(e.target.value)}
            aria-label="Model selection"
            className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--text-muted)] transition-colors"
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}{m.recommended ? " (recommended)" : ""}
              </option>
            ))}
          </select>
        </section>

        {/* D. Pinned Context */}
        <section>
          <Label>Pinned Context</Label>
          <div className="mt-1.5">
            <PinnedContext value={draftCtx} onChange={setDraftCtx} />
          </div>
        </section>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Save settings
        </button>

        {/* E. Danger zone */}
        <section className="pt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">Danger zone</p>
          <button
            onClick={handleClearData}
            className="w-full rounded-md py-2 text-sm font-medium transition-colors"
            style={{
              border: "1px solid var(--removed)",
              color: confirmClear ? "white" : "var(--removed)",
              backgroundColor: confirmClear ? "var(--removed)" : "transparent",
            }}
          >
            {confirmClear ? "Click again to confirm — this cannot be undone" : "Clear all my data"}
          </button>
        </section>
      </div>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </p>
  );
}
