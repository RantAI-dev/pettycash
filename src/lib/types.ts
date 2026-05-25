export type UserRole = "requester" | "custodian" | "finance_admin" | "super_admin";

export type Status =
  | "draft"
  | "reported"
  | "rejected"
  | "verified"
  | "closed"
  | "requested"
  | "completed";

export type EventType =
  | "created"
  | "edited_draft"
  | "submitted"
  | "rejected"
  | "bukti_uploaded"
  | "bukti_removed"
  | "verified"
  | "closed"
  | "note_added"
  | "reopened";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  divisi: string;
  active: boolean;
  lastLogin: number | null;
}

export interface Attachment {
  id: string;
  fileName: string;
  imgData: string | null;
  mimeType?: string;
  fileSize?: number;
  uploadedBy: string;
  uploadedAt: number;
  kind: "bukti" | "quotation" | "other";
}

export interface TransactionEvent {
  id: string;
  transactionId: string;
  actorId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface Transaction {
  id: string;
  fundId: string;
  requesterId: string;
  custodianId: string;
  amount: number;
  category: string;
  project: string;
  pic: string | null;
  description: string;
  status: Status;
  spentDate: string;
  verbalApproval: string | null;
  createdAt: number;
  verifiedAt: number | null;
  closedAt: number | null;
  attachments: Attachment[];
  events: TransactionEvent[];
}

export interface PettyCashFund {
  id: string;
  name: string;
  ceiling: number;
  currentBalance: number;
  custodianId: string;
  preApprovalThreshold: number;
  buktiSlaHours: number;
}

export interface TopUpCycle {
  id: string;
  fundId: string;
  periodStart: number;
  periodEnd: number;
  totalSpent: number;
  requestedAmount: number;
  approvedAmount: number | null;
  status: "draft" | "requested" | "completed" | "rejected";
  requestedBy: string;
  approvedBy: string | null;
  requestedAt: number;
  approvedAt: number | null;
}

export interface Notification {
  id: string;
  text: string;
  time: number;
  read: boolean;
  txId?: string;
}

export interface NotifSettings {
  onApproved: boolean;
  onRejected: boolean;
  onBuktiMissing: boolean;
  onTopUpApproved: boolean;
  onNoteAdded: boolean;
}

export interface AppState {
  users: User[];
  fund: PettyCashFund;
  transactions: Transaction[];
  cycles: TopUpCycle[];
  categories: string[];
  projects: string[];
  currentUserId: string;
  notifications: Notification[];
  sidebarCollapsed: boolean;
  notifSettings: NotifSettings;
}
