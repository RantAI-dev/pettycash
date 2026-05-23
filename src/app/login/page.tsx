"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="login-shell"><div className="login-bg" /></div>}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const fromQuery = params.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi");
      return;
    }
    setSigningIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Login gagal");
        setSigningIn(false);
        return;
      }
      const data = (await res.json()) as { user: { name: string } };
      toast.success("Berhasil masuk", `Selamat datang, ${data.user.name}`);
      // Full reload so StoreProvider remounts with the new session cookie
      window.location.href = fromQuery;
    } catch {
      setError("Tidak bisa terhubung ke server");
      setSigningIn(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-bg" />
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <Image
            src="/rant-ai.png"
            alt="RantAI"
            width={40}
            height={40}
            style={{ height: 40, width: 40, borderRadius: 8, background: "#f6f8fb", padding: 4 }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 500 }}>Petty</div>
            <div className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em" }}>
              RantAI · Kas Internal
            </div>
          </div>
        </div>

        <h1 className="login-title">Masuk ke Petty.</h1>
        <p className="login-sub">
          Sistem manajemen petty cash internal. Hanya untuk karyawan RantAI dengan email{" "}
          <span className="mono" style={{ color: "var(--brand-sky)" }}>@rantai.dev</span>.
        </p>

        <div className="field">
          <label className="input-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@rantai.dev"
            autoFocus
            required
          />
        </div>

        <div className="field">
          <label className="input-label" htmlFor="login-password">Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              className="input"
              style={{ paddingRight: 38 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="icon-btn"
              style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 30, height: 30 }}
              aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(187, 81, 83, 0.1)",
              border: "1px solid rgba(187, 81, 83, 0.3)",
              borderRadius: 8,
              marginBottom: 16,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize: 12,
              color: "#e08a8c",
            }}
          >
            <ShieldAlert size={14} style={{ flex: "none", marginTop: 2 }} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={signingIn}>
          {signingIn ? (
            <>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Memproses…
            </>
          ) : (
            <>
              <LogIn size={14} /> Masuk
            </>
          )}
        </button>

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: "1px solid var(--hairline)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            v0.5.0 · MVP
          </span>
          <span className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Depok · West Java
          </span>
        </div>
      </form>
    </div>
  );
}
