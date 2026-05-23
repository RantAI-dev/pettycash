"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
}

interface ToastApi {
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3800);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, body) => push({ kind: "success", title, body }),
      error: (title, body) => push({ kind: "error", title, body }),
      info: (title, body) => push({ kind: "info", title, body }),
    }),
    [push],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === "success" && <CheckCircle2 size={16} style={{ color: "#8ed395", flex: "none", marginTop: 2 }} />}
            {t.kind === "error" && <AlertCircle size={16} style={{ color: "#e08a8c", flex: "none", marginTop: 2 }} />}
            {t.kind === "info" && <Info size={16} style={{ color: "var(--brand-sky)", flex: "none", marginTop: 2 }} />}
            <div style={{ flex: 1 }}>
              <div className="title">{t.title}</div>
              {t.body && <div className="body">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
