// Email delivery config — sensitive credentials (SMTP passwords, webhook
// secrets) MUST live server-side, never in the browser. This module now only
// holds non-sensitive display fields and a public webhook URL. Real sending
// must be done via a server function that reads its secrets from
// Lovable Cloud Secrets and signs requests server-side.
import { useSyncExternalStore } from "react";

export type EmailProvider = "webhook" | "disabled";

export interface EmailConfig {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  webhookUrl?: string;   // public endpoint of your server-side relay
  replyTo?: string;
  updatedAt?: number;
}

const KEY = "genz.emailConfig";
const DEFAULT: EmailConfig = {
  provider: "disabled",
  fromName: "GenZ Shop",
  fromEmail: "no-reply@genz.shop",
};

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: Listener) => { listeners.add(l); return () => listeners.delete(l); };

const cache = { raw: null as string | null, value: DEFAULT };

// Defensive sanitiser — strips any legacy secret fields that might still be
// sitting in a user's localStorage from previous builds.
function sanitize(input: any): EmailConfig {
  const safe: EmailConfig = {
    provider: input?.provider === "webhook" ? "webhook" : "disabled",
    fromName: typeof input?.fromName === "string" ? input.fromName : DEFAULT.fromName,
    fromEmail: typeof input?.fromEmail === "string" ? input.fromEmail : DEFAULT.fromEmail,
    webhookUrl: typeof input?.webhookUrl === "string" ? input.webhookUrl : undefined,
    replyTo: typeof input?.replyTo === "string" ? input.replyTo : undefined,
    updatedAt: typeof input?.updatedAt === "number" ? input.updatedAt : undefined,
  };
  return safe;
}

export function getEmailConfig(): EmailConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (cache.raw === raw) return cache.value;
    const parsed = raw ? JSON.parse(raw) : DEFAULT;
    const value = sanitize(parsed);
    cache.raw = raw;
    cache.value = value;
    return value;
  } catch { return DEFAULT; }
}

export function saveEmailConfig(cfg: EmailConfig) {
  const next = { ...sanitize(cfg), updatedAt: Date.now() };
  const raw = JSON.stringify(next);
  localStorage.setItem(KEY, raw);
  cache.raw = raw;
  cache.value = next;
  emit();
}

export const useEmailConfig = (): EmailConfig =>
  useSyncExternalStore(subscribe, getEmailConfig, () => DEFAULT);

export const isEmailConfigured = (cfg = getEmailConfig()) =>
  cfg.provider === "webhook" && !!cfg.webhookUrl && !!cfg.fromEmail;

export interface SendEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: string;
}

export type SendResult = { ok: true; provider: EmailProvider } | { ok: false; error: string };

// Posts to a PUBLIC webhook only. No secrets are attached client-side; your
// server-side relay should authenticate the caller via its own mechanism
// (origin check, signed token issued by your backend, etc.).
export async function sendEmail(payload: SendEmailPayload): Promise<SendResult> {
  const cfg = getEmailConfig();
  if (!isEmailConfigured(cfg)) return { ok: false, error: "Email is not configured" };
  try {
    const body = {
      provider: cfg.provider,
      from: { name: cfg.fromName, email: cfg.fromEmail },
      replyTo: cfg.replyTo || undefined,
      ...payload,
    };
    const res = await fetch(cfg.webhookUrl!, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: `Relay returned ${res.status}` };
    return { ok: true, provider: cfg.provider };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export function buildResetEmail(opts: { to: string; resetUrl: string; isAdmin: boolean }): SendEmailPayload {
  const { to, resetUrl, isAdmin } = opts;
  const role = isAdmin ? "admin" : "customer";
  const subject = isAdmin ? "Reset your GenZ admin password" : "Reset your GenZ password";
  const text = `Hi,\n\nWe received a request to reset your GenZ ${role} password.\nClick the link below to set a new password — it expires in 30 minutes.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\n— GenZ Shop`;
  const html = `<!doctype html><html><body><p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p></body></html>`;
  return { to, subject, text, html, category: `password_reset_${role}` };
}
