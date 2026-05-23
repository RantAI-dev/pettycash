"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Check,
  ChevronsUpDown,
  ClipboardCheck,
  FlaskConical,
  History,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  User as UserIcon,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useStore, sel } from "@/store/store";
import { Avatar, ConfirmDialog, StatusBadge } from "@/components/ui/primitives";
import { fmtIDR } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import type { UserRole } from "@/lib/types";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["requester", "custodian", "finance_admin", "super_admin"] },
  { path: "/transactions", label: "Transaksi", icon: ReceiptText, roles: ["requester", "custodian", "finance_admin", "super_admin"] },
  { path: "/approvals", label: "Verifikasi", icon: ClipboardCheck, roles: ["custodian", "finance_admin", "super_admin"] },
  { path: "/topup", label: "Top-Up", icon: Wallet, roles: ["custodian", "finance_admin", "super_admin"] },
];

const ADMIN_NAV: NavItem[] = [
  { path: "/admin/users", label: "Pengguna", icon: Users, roles: ["super_admin"] },
  { path: "/admin/fund", label: "Pengaturan", icon: Settings2, roles: ["super_admin"] },
  { path: "/admin/audit", label: "Audit Log", icon: History, roles: ["super_admin"] },
];

function navItemsForRole(role: UserRole) {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

function buildCrumb(path: string): Array<{ label: string; path?: string }> {
  if (path === "/" || path === "") return [{ label: "Dashboard" }];
  if (path === "/transactions") return [{ label: "Dashboard", path: "/" }, { label: "Transaksi" }];
  if (path.startsWith("/transactions/")) {
    const id = path.split("/")[2];
    return [
      { label: "Dashboard", path: "/" },
      { label: "Transaksi", path: "/transactions" },
      { label: id },
    ];
  }
  if (path === "/approvals") return [{ label: "Dashboard", path: "/" }, { label: "Verifikasi" }];
  if (path === "/topup") return [{ label: "Dashboard", path: "/" }, { label: "Top-Up" }];
  if (path.startsWith("/topup/")) {
    return [{ label: "Dashboard", path: "/" }, { label: "Top-Up", path: "/topup" }, { label: "Detail Cycle" }];
  }
  if (path === "/admin/users") return [{ label: "Admin" }, { label: "Pengguna" }];
  if (path === "/admin/fund") return [{ label: "Admin" }, { label: "Pengaturan Fund" }];
  if (path === "/admin/audit") return [{ label: "Admin" }, { label: "Audit Log" }];
  if (path === "/notifications") return [{ label: "Notifikasi" }];
  if (path === "/profile") return [{ label: "Profil" }];
  return [{ label: path }];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const pathname = usePathname() || "/";
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const collapsed = state.sidebarCollapsed;

  return (
    <div className={`app-shell ${collapsed ? "collapsed" : ""}`}>
      <Sidebar pathname={pathname} />
      <div className="main-col">
        <TopBar pathname={pathname} onOpenNotif={() => setNotifOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <div className="main-scroll">{children}</div>
        <BottomNav pathname={pathname} />
      </div>
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const { state, currentUser, actions } = useStore();
  const collapsed = state.sidebarCollapsed;
  const items = navItemsForRole(currentUser.role);
  const adminItems = ADMIN_NAV.filter((i) => i.roles.includes(currentUser.role));
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [userMenuOpen]);

  const pending = sel.pendingActionCountForUser(state, currentUser);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Image src="/rant-ai.png" alt="RantAI" width={32} height={32} className="sb-logo" />
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wordmark-mini">Petty</div>
            <div className="product-tag">RantAI · Kas Internal</div>
          </div>
        )}
        <button
          className="icon-btn sb-collapse"
          onClick={() => actions.setSidebarCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => {
          const active = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path} className={`nav-item ${active ? "active" : ""}`}>
              <Icon size={16} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.path === "/approvals" && pending > 0 && currentUser.role !== "requester" && (
                <span className="nav-badge">{pending}</span>
              )}
            </Link>
          );
        })}
        {adminItems.length > 0 && (
          <>
            {!collapsed && <div className="sidebar-section-label">Admin</div>}
            {collapsed && <div style={{ height: 8 }} />}
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.path;
              return (
                <Link key={item.path} href={item.path} className={`nav-item ${active ? "active" : ""}`}>
                  <Icon size={16} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <div className="sidebar-footer" ref={userMenuRef} style={{ position: "relative" }}>
        <div className="user-card" onClick={() => setUserMenuOpen((v) => !v)}>
          <Avatar user={currentUser} size="md" />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser.name}
              </div>
              <div className="meta">{currentUser.role.replace("_", " ")}</div>
            </div>
          )}
          {!collapsed && <ChevronsUpDown size={14} style={{ color: "var(--muted-foreground)" }} />}
        </div>
        {userMenuOpen && <UserMenu onClose={() => setUserMenuOpen(false)} />}
      </div>
    </aside>
  );
}

function UserMenu({ onClose }: { onClose: () => void }) {
  const { state, currentUser, actions } = useStore();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const isSuperAdmin = currentUser.role === "super_admin";

  // Impersonation menu: one user per role for super_admin testing
  const impersonateUsers = ["u_sarah", "u_risman", "u_simon", "u_shiro"]
    .map((id) => state.users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const doLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore — cookie clears server-side; if it fails, full reload still kicks user out via middleware */
    }
    window.location.href = "/login";
  };

  return (
    <>
      <div
        className="menu"
        style={{ bottom: "calc(100% + 6px)", left: 12, right: 12, position: "absolute", minWidth: 0 }}
      >
        <div className="menu-label">Akun</div>
        <Link href="/profile" className="menu-item" onClick={onClose}>
          <UserIcon size={14} />
          <span>Profil saya</span>
        </Link>
        <Link href="/notifications" className="menu-item" onClick={onClose}>
          <Bell size={14} />
          <span>Notifikasi</span>
        </Link>
        {isSuperAdmin && (
          <>
            <div className="menu-divider" />
            <div className="menu-label">Impersonasi (Demo)</div>
            {impersonateUsers.map((u) => (
              <button
                key={u.id}
                className="menu-item"
                onClick={async () => {
                  try {
                    await actions.switchUser(u.id);
                    toast.info("Beralih peran", `Sekarang sebagai ${u.name} (${u.role.replace("_", " ")})`);
                  } catch {
                    toast.error("Gagal impersonasi");
                  }
                  onClose();
                }}
              >
                <Avatar user={u} size="sm" />
                <span style={{ flex: 1, textAlign: "left" }}>
                  <span style={{ fontSize: 13 }}>{u.name.split(" ")[0]}</span>
                  <span
                    className="mono dim"
                    style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}
                  >
                    {u.role.replace("_", " ")}
                  </span>
                </span>
                {currentUser.id === u.id && <Check size={14} style={{ color: "var(--brand-sky)" }} />}
              </button>
            ))}
            <div className="menu-divider" />
            <button
              className="menu-item"
              onClick={() => {
                setConfirmReset(true);
                onClose();
              }}
            >
              <RefreshCw size={14} />
              <span>Reset Demo Data</span>
            </button>
          </>
        )}
        <div className="menu-divider" />
        <button
          className="menu-item danger"
          onClick={(e) => {
            e.preventDefault();
            doLogout();
            onClose();
          }}
        >
          <LogOut size={14} />
          <span>Keluar</span>
        </button>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.resetDemo();
          toast.success("Demo direset", "Data dikembalikan ke kondisi awal");
        }}
        title="Reset semua data demo?"
        message="Semua transaksi, top-up, dan perubahan yang Anda buat akan dihapus. Aksi ini hanya berlaku di browser ini."
        confirmLabel="Ya, reset"
        danger
      />
    </>
  );
}

function TopBar({
  pathname,
  onOpenNotif,
  onOpenSearch,
}: {
  pathname: string;
  onOpenNotif: () => void;
  onOpenSearch: () => void;
}) {
  const { state, currentUser } = useStore();
  const unread = state.notifications.filter((n) => !n.read).length;
  const crumb = buildCrumb(pathname);

  return (
    <div className="topbar">
      <div className="breadcrumb">
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            {i === crumb.length - 1 ? (
              <span className="current">{c.label}</span>
            ) : (
              <Link href={c.path ?? "#"}>{c.label}</Link>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="topbar-search" onClick={onOpenSearch} style={{ cursor: "pointer" }}>
        <Search size={14} style={{ color: "var(--muted-foreground)" }} />
        <input placeholder="Cari transaksi, pemohon, deskripsi…" readOnly />
        <span className="kbd">⌘K</span>
      </div>

      <button className="icon-btn" onClick={onOpenNotif} aria-label="Notifications" title="Notifikasi">
        <Bell size={16} />
        {unread > 0 && <span className="dot-badge" />}
      </button>

      <Avatar user={currentUser} size="sm" />
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const { currentUser } = useStore();
  const items = navItemsForRole(currentUser.role).slice(0, 4);
  if (items.length < 4) items.push({ path: "/profile", label: "Profil", icon: UserIcon, roles: [] as UserRole[] });
  return (
    <div className="bottom-nav">
      <div className="row">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`item ${active ? "active" : ""}`}>
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function NotificationsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, actions } = useStore();
  if (!open) return null;
  const unread = state.notifications.filter((n) => !n.read).length;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <div className="sub">{unread} belum dibaca</div>
            <h2>Notifikasi</h2>
          </div>
          {unread > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => actions.markAllNotifsRead()}
              style={{ marginRight: 8 }}
            >
              <Check size={13} /> Tandai semua
            </button>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {state.notifications.length === 0 ? (
            <div className="empty">
              <div className="icon-wrap">
                <Bell size={22} />
              </div>
              <h3>Tidak ada notifikasi</h3>
              <p>Pemberitahuan tentang laporan Anda akan muncul di sini.</p>
            </div>
          ) : (
            state.notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${!n.read ? "unread" : ""}`}
                onClick={() => {
                  actions.markNotifRead(n.id);
                  onClose();
                  if (n.txId) window.location.href = `/transactions/${n.txId}`;
                }}
              >
                <div style={{ flex: 1 }}>
                  <div className="text">{n.text}</div>
                  <div className="time">{new Date(n.time).toLocaleString("id-ID")}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);
  if (!open) return null;
  const ql = q.toLowerCase().trim();
  const results = !ql
    ? state.transactions.slice(0, 8)
    : state.transactions
        .filter((t) => {
          const u = sel.userById(state, t.requesterId);
          return (
            t.id.toLowerCase().includes(ql) ||
            t.description.toLowerCase().includes(ql) ||
            (u && u.name.toLowerCase().includes(ql)) ||
            t.category.toLowerCase().includes(ql)
          );
        })
        .slice(0, 12);

  return (
    <div className="modal-backdrop center" onClick={onClose}>
      <div className="modal center" style={{ width: 600, maxHeight: 600 }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--hairline)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Search size={16} style={{ color: "var(--muted-foreground)" }} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari transaksi, pemohon, deskripsi…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 15,
            }}
          />
          <span
            className="kbd"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              padding: "2px 6px",
              border: "1px solid var(--hairline-strong)",
              borderRadius: 4,
              color: "var(--muted-foreground)",
            }}
          >
            ESC
          </span>
        </div>
        <div style={{ maxHeight: 460, overflowY: "auto" }}>
          {results.length === 0 ? (
            <div className="empty">
              <p>Tidak ada hasil</p>
            </div>
          ) : (
            results.map((tx) => {
              const u = sel.userById(state, tx.requesterId);
              return (
                <Link
                  key={tx.id}
                  href={`/transactions/${tx.id}`}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 18px",
                    width: "100%",
                    textAlign: "left",
                    borderBottom: "1px solid var(--hairline)",
                  }}
                >
                  <Avatar user={u} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.description}
                    </div>
                    <div className="mono dim" style={{ fontSize: 11, letterSpacing: 0 }}>
                      {tx.id} · {u?.name} · {fmtIDR(tx.amount)}
                    </div>
                  </div>
                  <StatusBadge status={tx.status} />
                </Link>
              );
            })
          )}
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--hairline)" }}>
          <span className="mono dim" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FlaskConical size={11} /> Demo Search · 65 transaksi dimuat
          </span>
        </div>
      </div>
    </div>
  );
}
