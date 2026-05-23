"use client";

import React, { useEffect, useState } from "react";
import { Copy, Key, Lock, MoreHorizontal, Search, Send, UserPlus, UserX } from "lucide-react";
import { can, useStore } from "@/store/store";
import {
  AvatarRow,
  Button,
  Card,
  ConfirmDialog,
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
import type { UserRole } from "@/lib/types";

export default function AdminUsersPage() {
  const { state, currentUser, actions } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

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
                      <MenuItem icon={Key} onClick={() => toast.info("Reset password", "Email reset password dikirim")}>
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
    </div>
  );
}

function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions } = useStore();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("requester");
  const [divisi, setDivisi] = useState("Engineering");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setRole("requester");
      setDivisi("Engineering");
    }
  }, [open]);

  const submit = () => {
    if (!email.includes("@")) {
      toast.error("Email tidak valid");
      return;
    }
    setConfirm(true);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        variant="center"
        title="Invite Pengguna Baru"
        subtitle="User Management"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary" icon={Send} onClick={submit}>
              Kirim Undangan
            </Button>
          </>
        }
      >
        <Field label="Nama Lengkap">
          <Input value={name} onChange={setName} placeholder="Nama lengkap (opsional)" />
        </Field>
        <Field label="Email" help="Hanya email dengan domain @rantai.dev yang diperbolehkan">
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
      </Modal>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          actions.inviteUser({ email, name, role, divisi });
          toast.success("Undangan terkirim", `Email aktivasi dikirim ke ${email}`);
          onClose();
        }}
        title="Kirim undangan?"
        message={`Email aktivasi akan dikirim ke ${email} dengan role ${role.replace("_", " ")} di divisi ${divisi}.`}
        confirmLabel="Kirim Undangan"
      />
    </>
  );
}
