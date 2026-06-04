// Admin audit log — tracks security-relevant events.
// Stored in localStorage; swap to a REST/DB call later.
import { useMemo } from "react";
import { useSyncExternalStore } from "react";

export type AuditAction =
  | "admin_login"
  | "admin_login_failed"
  | "customer_login"
  | "sign_out"
  | "password_reset_requested"
  | "password_reset_used"
  | "password_reset_failed"
  | "admin_email_settings_updated";

export interface AuditEntry {
  id: string;
  at: number;
  action: AuditAction;
  actorEmail?: string;
  actorId?: string;
  isAdmin?: boolean;
  detail?: string;
  ip?: string;       // best-effort (browser can't reliably get IP — left for backend)
  userAgent?: string;
}

const KEY = "genz.audit";
const MAX = 500;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: Listener) => { listeners.add(l); return () => listeners.delete(l); };

const cache = { raw: null as string | null, value: [] as AuditEntry[] };

function read(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (cache.raw === raw) return cache.value;
    const value = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    cache.raw = raw;
    cache.value = value;
    return value;
  } catch { return []; }
}

function write(list: AuditEntry[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(list);
  localStorage.setItem(KEY, raw);
  cache.raw = raw;
  cache.value = list;
  emit();
}

export function recordAudit(entry: Omit<AuditEntry, "id" | "at" | "userAgent"> & { at?: number }) {
  const list = read();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  list.unshift({
    id: crypto.randomUUID(),
    at: entry.at ?? Date.now(),
    userAgent: ua,
    ...entry,
  });
  if (list.length > MAX) list.length = MAX;
  write(list);
}

export const getAuditLog = (): AuditEntry[] => read();
export const clearAuditLog = () => write([]);

export const useAuditLog = (): AuditEntry[] =>
  useSyncExternalStore(subscribe, read, read);

export const useAuditFiltered = (filter?: AuditAction | "all") => {
  const all = useAuditLog();
  return useMemo(() => (!filter || filter === "all" ? all : all.filter((e) => e.action === filter)), [all, filter]);
};

export const AUDIT_LABELS: Record<AuditAction, string> = {
  admin_login: "Admin sign-in",
  admin_login_failed: "Admin sign-in failed",
  customer_login: "Customer sign-in",
  sign_out: "Sign-out",
  password_reset_requested: "Reset link requested",
  password_reset_used: "Password reset",
  password_reset_failed: "Reset attempt failed",
  admin_email_settings_updated: "Email settings updated",
};

export const AUDIT_TONES: Record<AuditAction, string> = {
  admin_login: "bg-pop-cyan",
  admin_login_failed: "bg-destructive text-white",
  customer_login: "bg-pop-yellow",
  sign_out: "bg-white",
  password_reset_requested: "bg-pop-orange",
  password_reset_used: "bg-pop-pink text-white",
  password_reset_failed: "bg-destructive text-white",
  admin_email_settings_updated: "bg-ink text-paper",
};
