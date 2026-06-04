// Email delivery config — supports a generic webhook (Zapier/Make/n8n/your API)
// and SMTP-style fields (host, port, username, password, from).
// In a static-only build we can't open raw SMTP from the browser, so the
// "smtp" mode posts the same payload to your configured relay endpoint —
// you wire the relay to actually send via SMTP. The "webhook" mode just
// posts to any URL you specify (e.g. a serverless function).
import { useSyncExternalStore } from "react";

export type EmailProvider = "webhook" | "smtp" | "disabled";

export interface EmailConfig {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  // webhook
  webhookUrl?: string;
  webhookSecret?: string;
  // smtp (relayed via webhookUrl on the server side)
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  // misc
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

export function getEmailConfig(): EmailConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (cache.raw === raw) return cache.value;
    const value = raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
    cache.raw = raw;
    cache.value = value;
    return value;
  } catch { return DEFAULT; }
}

export function saveEmailConfig(cfg: EmailConfig) {
  const next = { ...cfg, updatedAt: Date.now() };
  const raw = JSON.stringify(next);
  localStorage.setItem(KEY, raw);
  cache.raw = raw;
  cache.value = next;
  emit();
}

export const useEmailConfig = (): EmailConfig =>
  useSyncExternalStore(subscribe, getEmailConfig, () => DEFAULT);

export const isEmailConfigured = (cfg = getEmailConfig()) =>
  cfg.provider !== "disabled" && !!cfg.webhookUrl && !!cfg.fromEmail;

export interface SendEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: string;
}

export type SendResult = { ok: true; provider: EmailProvider } | { ok: false; error: string };

export async function sendEmail(payload: SendEmailPayload): Promise<SendResult> {
  const cfg = getEmailConfig();
  if (!isEmailConfigured(cfg)) return { ok: false, error: "Email is not configured" };
  try {
    const body = {
      provider: cfg.provider,
      from: { name: cfg.fromName, email: cfg.fromEmail },
      replyTo: cfg.replyTo || undefined,
      smtp: cfg.provider === "smtp" ? {
        host: cfg.smtpHost, port: cfg.smtpPort, user: cfg.smtpUser,
        password: cfg.smtpPassword, secure: !!cfg.smtpSecure,
      } : undefined,
      ...payload,
    };
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.webhookSecret) headers["X-Webhook-Secret"] = cfg.webhookSecret;
    const res = await fetch(cfg.webhookUrl!, {
      method: "POST",
      mode: "cors",
      headers,
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
  const subject = isAdmin
    ? "Reset your GenZ admin password"
    : "Reset your GenZ password";
  const text =
`Hi,

We received a request to reset your GenZ ${role} password.
Click the link below to set a new password — it expires in 30 minutes.

${resetUrl}

If you didn't request this, you can safely ignore this email.

— GenZ Shop`;
  const html = `<!doctype html><html><body style="font-family:Inter,system-ui,Arial,sans-serif;background:#fafafa;padding:24px;color:#0a0a0a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:3px solid #0a0a0a;border-radius:18px;padding:28px">
    <h1 style="margin:0 0 8px;font-size:28px">Reset your password</h1>
    <p style="margin:0 0 16px;color:#555">We received a request to reset your GenZ ${role} password.</p>
    <p style="margin:0 0 24px"><a href="${resetUrl}" style="display:inline-block;background:#ec4899;color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px;border:3px solid #0a0a0a">Set a new password</a></p>
    <p style="margin:0;color:#888;font-size:12px">This link expires in 30 minutes. If you didn't request this, ignore this email.</p>
  </div>
</body></html>`;
  return { to, subject, text, html, category: `password_reset_${role}` };
}
