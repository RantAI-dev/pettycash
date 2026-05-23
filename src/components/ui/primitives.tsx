"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, type LucideIcon, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { avatarColor, initials } from "@/lib/format";
import type { Attachment, Status, User } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";

type Variant = "primary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "lg" | "icon";

export function Button({
  variant = "outline",
  size,
  icon: Icon,
  iconRight: IconRight,
  children,
  onClick,
  disabled,
  type = "button",
  as = "button",
  href,
  style,
  className = "",
  title,
  ariaLabel,
}: {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  as?: "button" | "a" | "link";
  href?: string;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const iconSize = size === "sm" ? 13 : 15;
  const content = (
    <>
      {Icon && <Icon size={iconSize} />}
      {children}
      {IconRight && <IconRight size={iconSize} />}
    </>
  );
  const cls = `btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`;

  if (as === "link" && href) {
    return (
      <Link href={href} className={cls} style={style} title={title} aria-label={ariaLabel} onClick={onClick}>
        {content}
      </Link>
    );
  }
  if (as === "a" && href) {
    return (
      <a href={href} className={cls} style={style} title={title} aria-label={ariaLabel} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={cls} style={style} title={title} aria-label={ariaLabel} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

export function Avatar({ user, size = "md" }: { user: User | undefined; size?: "sm" | "md" | "lg" | "xl" }) {
  if (!user) return null;
  const cls = size === "sm" ? "avatar sm" : size === "lg" ? "avatar lg" : size === "xl" ? "avatar xl" : "avatar";
  return (
    <span
      className={cls}
      style={{ background: `linear-gradient(135deg, ${avatarColor(user.id)}, ${avatarColor(user.id + "x")})` }}
    >
      {initials(user.name)}
    </span>
  );
}

export function AvatarRow({ user, withRole, withDivisi }: { user: User | undefined; withRole?: boolean; withDivisi?: boolean }) {
  if (!user) return <span className="dim">—</span>;
  return (
    <span className="avatar-row">
      <Avatar user={user} size="sm" />
      <span>
        <span className="name">{user.name}</span>
        {(withRole || withDivisi) && (
          <span className="mono dim" style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {[withRole && user.role.replace("_", " "), withDivisi && user.divisi].filter(Boolean).join(" · ")}
          </span>
        )}
      </span>
    </span>
  );
}

export function Badge({
  children,
  status,
  category,
  custom,
  large,
}: {
  children?: React.ReactNode;
  status?: Status;
  category?: boolean;
  custom?: string;
  large?: boolean;
}) {
  let cls = "badge" + (large ? " lg" : "");
  if (status) cls += ` badge-status-${status}`;
  else if (category) cls += " badge-cat";
  else if (custom) cls += ` badge-${custom}`;
  return (
    <span className={cls}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function StatusBadge({ status, large }: { status: Status; large?: boolean }) {
  return (
    <Badge status={status} large={large}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}

export function Card({
  children,
  header,
  headerActions,
  flush,
  tight,
  style,
  className = "",
}: {
  children?: React.ReactNode;
  header?: React.ReactNode;
  headerActions?: React.ReactNode;
  flush?: boolean;
  tight?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div className={`card ${tight ? "card-tight" : ""} ${flush ? "card-flush" : ""} ${className}`} style={style}>
      {header && (
        <div className="card-header">
          <h3>{header}</h3>
          {headerActions && <div className="actions">{headerActions}</div>}
        </div>
      )}
      {flush ? children : <div>{children}</div>}
    </div>
  );
}

export function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      {Icon && (
        <div className="icon-wrap">
          <Icon size={22} />
        </div>
      )}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="progress" style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: "linear-gradient(90deg, var(--brand-deep-blue), var(--brand-sky))",
          borderRadius: 99,
          transition: "width 400ms var(--ease-out-soft)",
        }}
      />
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <span
        style={{
          width: 32,
          height: 18,
          borderRadius: 99,
          background: checked ? "var(--brand-sky)" : "rgba(255,255,255,0.12)",
          position: "relative",
          transition: "background 200ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: 99,
            background: "#fff",
            transition: "left 200ms",
          }}
        />
      </span>
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ display: "none" }}
      />
    </label>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: checked ? "var(--brand-sky)" : "transparent",
          border: `1px solid ${checked ? "var(--brand-sky)" : "var(--hairline-strong)"}`,
          display: "grid",
          placeItems: "center",
          transition: "all 150ms",
        }}
      >
        {checked && <Check size={12} style={{ color: "#072036" }} />}
      </span>
      {label && <span style={{ fontSize: 13 }}>{label}</span>}
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ display: "none" }}
      />
    </label>
  );
}

export function Field({
  label,
  error,
  help,
  children,
}: {
  label?: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      {label && <label className="input-label">{label}</label>}
      {children}
      {error ? <div className="input-error">{error}</div> : help ? <div className="input-help">{help}</div> : null}
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  ...rest
}: {
  value?: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <input
      type={type}
      className={`input ${error ? "error" : ""}`}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
  error,
  rows = 3,
  ...rest
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  rows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "rows">) {
  return (
    <textarea
      className={`textarea ${error ? "error" : ""}`}
      value={value ?? ""}
      rows={rows}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  error,
  placeholder,
  ...rest
}: {
  value?: string;
  onChange?: (v: string) => void;
  options: Array<string | { value: string; label: string }>;
  error?: boolean;
  placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  return (
    <select
      className={`select ${error ? "error" : ""}`}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ),
      )}
    </select>
  );
}

export function CurrencyInput({
  value,
  onChange,
  error,
  placeholder,
}: {
  value?: number | null;
  onChange?: (v: number | null) => void;
  error?: boolean;
  placeholder?: string;
}) {
  const display =
    value == null || (value as unknown as string) === ""
      ? ""
      : Math.round(Number(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (
    <div style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--muted-foreground)",
        }}
      >
        Rp
      </span>
      <input
        className={`input ${error ? "error" : ""}`}
        style={{ paddingLeft: 36, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}
        value={display}
        onChange={(e) => {
          const num = e.target.value.replace(/\D/g, "");
          onChange?.(num ? Number(num) : null);
        }}
        placeholder={placeholder || "0"}
        inputMode="numeric"
      />
    </div>
  );
}

// ============ Modal ============
export function Modal({
  open,
  onClose,
  children,
  title,
  subtitle,
  variant = "drawer",
  footer,
  width,
}: {
  open: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  variant?: "drawer" | "center";
  footer?: React.ReactNode;
  width?: "wide" | string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={`modal-backdrop ${variant === "center" ? "center" : ""}`} onClick={onClose}>
      <div
        className={`modal ${variant === "center" ? "center" : ""} ${width === "wide" ? "wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        style={width && width !== "wide" ? { width } : undefined}
      >
        {(title || subtitle) && (
          <div className="modal-head">
            <div style={{ flex: 1 }}>
              {subtitle && <div className="sub">{subtitle}</div>}
              {title && <h2>{title}</h2>}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onConfirm,
  onClose,
  title,
  message,
  confirmLabel = "Konfirmasi",
  danger,
}: {
  open: boolean;
  onConfirm?: () => void;
  onClose?: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="center"
      title={title}
      subtitle="Konfirmasi"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>{message}</div>
    </Modal>
  );
}

// ============ Tabs ============
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.value} className={value === t.value ? "active" : ""} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count != null && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ============ Menu / popover ============
export function Menu({
  trigger,
  children,
  align = "right",
}: {
  trigger: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          setOpen((v) => !v);
        },
      })}
      {open && (
        <div
          className="menu"
          style={{ top: "calc(100% + 4px)", [align]: 0 } as React.CSSProperties}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </span>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button className={`menu-item ${danger ? "danger" : ""}`} onClick={onClick}>
      {Icon && <Icon size={14} />}
      <span>{children}</span>
    </button>
  );
}

// ============ Dropzone ============
export function Dropzone({
  onFiles,
  multiple = true,
  label = "Drag satu atau beberapa file kemari",
  hint = "JPG, PNG, PDF — pilih beberapa file sekaligus, maks 5MB per file",
}: {
  onFiles: (files: Array<{ fileName: string; imgData: string | null; mimeType: string; fileSize: number }>) => void;
  multiple?: boolean;
  label?: string;
  hint?: string;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFiles = (fileList: FileList | null) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    Promise.all(
      arr.map(
        (f) =>
          new Promise<{ fileName: string; imgData: string | null; mimeType: string; fileSize: number }>((res) => {
            if (f.type.startsWith("image/")) {
              const reader = new FileReader();
              reader.onload = () =>
                res({ fileName: f.name, imgData: reader.result as string, mimeType: f.type, fileSize: f.size });
              reader.readAsDataURL(f);
            } else {
              res({ fileName: f.name, imgData: null, mimeType: f.type, fileSize: f.size });
            }
          }),
      ),
    ).then(onFiles);
  };
  return (
    <div
      className={`dropzone ${drag ? "drag" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="icon">
        <UploadCloud size={28} />
      </div>
      <div className="label">{label}</div>
      <div className="hint">{hint}</div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept="image/*,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
      <button
        className="icon-btn"
        style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.1)" }}
        onClick={onClose}
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ============ Pagination bar ============
export function PaginationBar({
  page,
  totalPages,
  setPage,
  total,
  pageSize,
}: {
  page: number;
  totalPages: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div
      style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--hairline)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <span className="mono dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {start}–{end} dari {total}
      </span>
      <div className="row" style={{ gap: 4 }}>
        <Button variant="ghost" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Sebelumnya
        </Button>
        <span className="mono" style={{ fontSize: 12, padding: "0 12px" }}>
          Hal {page} / {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          iconRight={ChevronRight}
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}

export function AttachmentCard({
  att,
  onClick,
  uploaderName,
}: {
  att: Attachment;
  onClick?: () => void;
  uploaderName?: string;
}) {
  return (
    <div className="attach-card" onClick={onClick}>
      <div className={`attach-thumb ${att.imgData ? "has-img" : ""}`}>
        {att.imgData ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={att.imgData} alt={att.fileName} />
        ) : (
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em" }}>PDF</span>
        )}
      </div>
      <div className="attach-meta">
        <div className="fname">{att.fileName}</div>
        {uploaderName && <div className="dim" style={{ marginTop: 2 }}>{uploaderName}</div>}
      </div>
    </div>
  );
}
