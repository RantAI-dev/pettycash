"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StoreProvider, useStore } from "@/store/store";
import { ToastProvider } from "@/components/ui/toast";
import { NewTransactionProvider } from "@/components/NewTransactionModal";
import { AppShell } from "@/components/layout/AppShell";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)" }} aria-hidden suppressHydrationWarning>
        <div style={{ height: 56 }} />
      </div>
    );
  }

  // /login is fully standalone — no store, no app shell, no /api/state call.
  if (pathname === "/login") {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <StoreProvider>
        <HydrationGate>
          <NewTransactionProvider>
            <AppShell>{children}</AppShell>
          </NewTransactionProvider>
        </HydrationGate>
      </StoreProvider>
    </ToastProvider>
  );
}

function HydrationGate({ children }: { children: React.ReactNode }) {
  const { loading, state } = useStore();
  if (loading && state.users.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "var(--muted-foreground)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          background: "var(--background)",
        }}
      >
        Memuat Petty…
      </div>
    );
  }
  return <>{children}</>;
}
