"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-[var(--accent)] text-white",
  error:   "bg-[var(--removed)] text-white",
  info:    "bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    // Start exit animation at 2.7s, fully remove at 3s
    const exitTimer = setTimeout(() => onRemove(toast.id), 3000);
    return () => clearTimeout(exitTimer);
  }, [toast.id, onRemove]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        "flex items-center gap-2 rounded-[6px] px-4 py-3 text-sm font-medium shadow-md",
        "min-w-[220px] max-w-[340px]",
        toast.exiting ? "toast-exit" : "toast-enter",
        typeStyles[toast.type],
      ].join(" ")}
    >
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast stack — fixed bottom-right */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
