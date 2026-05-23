"use client";

import React, { useEffect, useState } from "react";
import { ClipboardCheck, Copy, Key, Lock, MoreHorizontal, RefreshCw, Search, UserPlus, UserX } from "lucide-react";
import { can, useStore } from "@/store/store";
import {
  AvatarRow,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Menu,
  MenuItem,
  Modal,
  Select,
  Switch,
} from "@/components/ui/primitives";
import { fmtRelTime } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import type { User, UserRole } from "@/lib/types";

export default function AdminUsersPage() {
  const { state, currentUser, actions } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  if (!can.manageUsers(currentUser)) {
    return (
      <div className="page">
        <Empty icon={Lock} title="Akses Ditolak" body="Hanya super admin yang dapat mengelola pengguna." />
      </div>
    );
  }

  const filtered = state.users.filter((u) => {
    if (search) {
      const s = search.toLowerCase();
      if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    return true;
  });

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="page-subtitle">Admin · Manajemen Pengguna</div>
          <h1 className="page-title">Pengguna</h1>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => setInviteOpen(true)}>
          Invite User
        </Button>
      </div>

      <div className="filter-bar">
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email…"
          />
        </div>
        <select
          className="select"
          style={{ width: "auto" }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Semua Role</option>
          <option value="requester">Requester</option>
          <option value="custodian">Custodian</option>
          <option value="finance_admin">Finance Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      <Card flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Divisi</th>
                <th>Last Login</th>
                <th>Status</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ cursor: "default" }}>
                  <td>
                    <AvatarRow user={u} />
                  </td>
                  <td className="mono dim" style={{ fontSize: 12, letterSpacing: 0 }}>
                    {u.email}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="select"
                      style={{ width: 140, padding: "4px 8px", fontSize: 12 }}
                      value={u.role}
                      onChange={(e) => {
                        actions.updateUser(u.id, { role: e.target.value as UserRole });
                        toast.success("Role diubah", `${u.name} → ${e.target.value.replace("_", " ")}`);
                      }}
                    >
                      <option value="requester">Requester</option>
                      <option value="custodian">Custodian</option>
                      <option value="finance_admin">Finance Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="select"
                      style={{ width: 130, padding: "4px 8px", fontSize: 12 }}
                      value={u.divisi}
                      onChange={(e) => actions.updateUser(u.id, { divisi: e.target.value })}
                    >
                      <option>Engineering</option>
                      <option>Sales</option>
                      <option>Operations</option>
                      <option>Finance</option>
                      <option>Marketing</option>
                    </select>
                  </td>
                  <td className="mono dim" style={{ fontSize: 11 }}>
                    {u.lastLogin ? fmtRelTime(u.lastLogin) : "—"}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Switch checked={u.active} onChange={(v) => actions.updateUser(u.id, { active: v })} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <Menu
                      trigger={
                        <button className="icon-btn" style={{ width: 28, height: 28 }}>
                          <MoreHorizontal size={14} />
                        </button>
                      }
                    >
                      <MenuItem
                        icon={Copy}
                        onClick={() => {
                          navigator.clipboard?.writeText(u.email);
                          toast.info("Disalin", u.email);
                        }}
                      >
                        Salin email
                      </MenuItem>
                      <MenuItem icon={Key} onClick={() => setResetTarget(u)}>
                        Reset password
                      </MenuItem>
                      <div className="menu-divider" />
                      <MenuItem icon={UserX} danger onClick={() => actions.updateUser(u.id, { active: false })}>
                        Nonaktifkan
                      </MenuItem>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
    </div>
  );
}

function generatePassword(): string {
  // 12 chars, base64url alphabet, no padding — easy to read aloud / paste.
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(9);
    window.crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  return Math.random().toString(36).slice(2, 14);
}

function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("requester");
  const [divisi, setDivisi] = useState("Engineering");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; name: string; password: string } | null>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setRole("requester");
      setDivisi("Engineering");
      setPassword(generatePassword());
      setCreated(null);
    }
  }, [open]);

  const submit = async () => {
    if (!email.includes("@")) {
      toast.error("Email tidak valid");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setSubmitting(true);
    try {
      await actions.inviteUser({ email: email.trim(), name: name.trim(), role, divisi, password });
      setCreated({ email: email.trim(), name: name.trim() || email.trim(), password });
    } catch (err) {
      toast.error("Gagal membuat pengguna", err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2 — show generated credentials once, then close
  if (created) {
    return (
      <CredentialsModal
        open
        title="Pengguna berhasil dibuat"
        subtitle="Bagikan kredensial ini ke user. Setelah modal ini ditutup, password tidak akan ditampilkan lagi."
        email={created.email}
        password={created.password}
        onClose={() => {
          setCreated(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="center"
      title="Buat Pengguna Baru"
      subtitle="User Management"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" icon={UserPlus} onClick={submit} disabled={submitting}>
            {submitting ? "Membuat…" : "Buat Akun"}
          </Button>
        </>
      }
    >
      <Field label="Nama Lengkap">
        <Input value={name} onChange={setName} placeholder="Nama lengkap (opsional)" />
      </Field>
      <Field label="Email">
        <Input value={email} onChange={setEmail} placeholder="nama@rantai.dev" type="email" />
      </Field>
      <Field label="Role">
        <Select
          value={role}
          onChange={(v) => setRole(v as UserRole)}
          options={[
            { value: "requester", label: "Requester — bisa membuat pengajuan" },
            { value: "custodian", label: "Custodian — verifikasi bukti" },
            { value: "finance_admin", label: "Finance Admin — approval top-up" },
            { value: "super_admin", label: "Super Admin — full access" },
          ]}
        />
      </Field>
      <Field label="Divisi">
        <Select
          value={divisi}
          onChange={setDivisi}
          options={["Engineering", "Sales", "Operations", "Finance", "Marketing"]}
        />
      </Field>
      <Field
        label="Password Sementara"
        help="Bagikan ke user lewat WA/lisan. User bisa ganti sendiri di halaman Profil mereka."
      >
        <div className="row" style={{ gap: 8 }}>
          <Input value={password} onChange={setPassword} placeholder="Password (min 6 karakter)" />
          <Button variant="outline" icon={RefreshCw} onClick={() => setPassword(generatePassword())}>
            Generate
          </Button>
        </div>
      </Field>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (user) {
      setPassword(generatePassword());
      setDone(null);
    }
  }, [user]);

  if (!user) return null;

  const submit = async () => {
    if (!password || password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setSubmitting(true);
    try {
      await actions.resetUserPassword(user.id, password);
      setDone({ email: user.email, password });
    } catch (err) {
      toast.error("Gagal reset password", err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <CredentialsModal
        open
        title="Password berhasil direset"
        subtitle={`Password baru untuk ${user.name}. Bagikan via WA/lisan — tidak akan ditampilkan lagi.`}
        email={done.email}
        password={done.password}
        onClose={() => {
          setDone(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      variant="center"
      title={`Reset Password — ${user.name}`}
      subtitle={user.email}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" icon={Key} onClick={submit} disabled={submitting}>
            {submitting ? "Mereset…" : "Reset Password"}
          </Button>
        </>
      }
    >
      <Field label="Password Baru" help="Setelah reset, session user yang lama otomatis tidak valid lagi.">
        <div className="row" style={{ gap: 8 }}>
          <Input value={password} onChange={setPassword} placeholder="Password (min 6 karakter)" />
          <Button variant="outline" icon={RefreshCw} onClick={() => setPassword(generatePassword())}>
            Generate
          </Button>
        </div>
      </Field>
    </Modal>
  );
}

function CredentialsModal({
  open,
  title,
  subtitle,
  email,
  password,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle: string;
  email: string;
  password: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const copyAll = () => {
    navigator.clipboard?.writeText(`Email: ${email}\nPassword: ${password}`);
    toast.info("Disalin ke clipboard");
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="center"
      title={title}
      subtitle="Bagikan kredensial"
      footer={
        <>
          <Button variant="outline" icon={Copy} onClick={copyAll}>
            Salin Email + Password
          </Button>
          <Button variant="primary" icon={ClipboardCheck} onClick={onClose}>
            Saya sudah simpan
          </Button>
        </>
      }
    >
      <p className="mono dim" style={{ fontSize: 12, marginBottom: 16, lineHeight: 1.6, textTransform: "none", letterSpacing: 0 }}>
        {subtitle}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
        <span className="input-label" style={{ margin: 0 }}>Email</span>
        <code style={{ background: "var(--surface-4)", padding: "8px 10px", borderRadius: 6, fontSize: 13, wordBreak: "break-all" }}>
          {email}
        </code>
        <button className="icon-btn" onClick={() => { navigator.clipboard?.writeText(email); toast.info("Email disalin"); }} aria-label="Salin email">
          <Copy size={14} />
        </button>

        <span className="input-label" style={{ margin: 0 }}>Password</span>
        <code style={{ background: "var(--surface-4)", padding: "8px 10px", borderRadius: 6, fontSize: 13, wordBreak: "break-all", color: "var(--brand-sky)" }}>
          {password}
        </code>
        <button className="icon-btn" onClick={() => { navigator.clipboard?.writeText(password); toast.info("Password disalin"); }} aria-label="Salin password">
          <Copy size={14} />
        </button>
      </div>
      <div
        className="mono dim"
        style={{
          marginTop: 16,
          padding: "10px 12px",
          background: "rgba(217, 165, 90, 0.08)",
          border: "1px solid rgba(217, 165, 90, 0.32)",
          borderRadius: 8,
          fontSize: 11,
          lineHeight: 1.6,
          textTransform: "none",
          letterSpacing: 0,
          color: "#e8b870",
        }}
      >
        ⚠ Password tidak disimpan di mana pun setelah modal ini ditutup. Pastikan sudah disalin / dicatat.
      </div>
    </Modal>
  );
}
