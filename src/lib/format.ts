export const fmtIDR = (n: number | null | undefined, opts: { frac?: boolean } = {}): string => {
  if (n == null || isNaN(n)) return "Rp 0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  const withDots = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}Rp ${withDots}${opts.frac ? ",00" : ""}`;
};

const ID_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const ID_BULAN_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export const fmtDate = (d: number | Date | string, opts: { short?: boolean } = {}): string => {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  const day = date.getDate();
  const m = opts.short ? ID_BULAN_SHORT[date.getMonth()] : ID_BULAN[date.getMonth()];
  return `${day} ${m} ${date.getFullYear()}`;
};

export const fmtDateTime = (d: number | Date | string): string => {
  const date = d instanceof Date ? d : new Date(d);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${fmtDate(date, { short: true })}, ${hh}:${mm}`;
};

export const fmtRelTime = (d: number | Date | string): string => {
  const date = d instanceof Date ? d : new Date(d);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return fmtDate(date, { short: true });
};

export const initials = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const firstName = (name: string): string => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const honorifics = ["pak", "bu", "ibu", "mas", "mbak", "bapak"];
  if (parts.length > 1 && honorifics.includes(parts[0].toLowerCase())) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
};

export const avatarColor = (id: string): string => {
  const colors = [
    "#bb7851", "#0d63d0", "#80cb87", "#388ca1", "#32836a",
    "#574399", "#bb5153", "#517fbb", "#5eb6fa",
  ];
  const seed = String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[seed % colors.length];
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  reported: "Menunggu Verifikasi",
  rejected: "Ditolak",
  verified: "Terverifikasi",
  closed: "Selesai",
  requested: "Menunggu Approval",
  completed: "Disetujui",
};

export const EVENT_TEMPLATES: Record<string, (a: { name: string }) => string> = {
  created: (a) => `${a.name} membuat laporan pengeluaran`,
  edited_draft: (a) => `${a.name} mengubah draft`,
  submitted: (a) => `${a.name} mengirim laporan untuk verifikasi`,
  rejected: (a) => `${a.name} menolak laporan`,
  bukti_uploaded: (a) => `Bukti diupload oleh ${a.name}`,
  bukti_removed: (a) => `${a.name} menghapus bukti`,
  verified: (a) => `${a.name} memverifikasi bukti`,
  closed: () => `Transaksi ditutup`,
  note_added: (a) => `${a.name} menambahkan catatan`,
  reopened: (a) => `${a.name} membuka kembali transaksi`,
};

export const EVENT_COLOR: Record<string, string> = {
  created: "blue",
  edited_draft: "blue",
  submitted: "blue",
  verified: "green",
  closed: "green",
  reopened: "green",
  rejected: "red",
  bukti_uploaded: "amber",
  bukti_removed: "amber",
  note_added: "gray",
};
