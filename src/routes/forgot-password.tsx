import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { requestPasswordReset } from "@/lib/store";
import { isEmailConfigured, useEmailConfig } from "@/lib/email-config";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, KeyRound, ShieldCheck, Copy, MailCheck, Settings } from "lucide-react";

type Search = { admin?: boolean };

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — GenZ" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    admin: s.admin === true || s.admin === "true",
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/forgot-password" }) as Search;
  const isAdmin = !!search.admin;
  const cfg = useEmailConfig();
  const emailReady = isEmailConfigured(cfg);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; emailed: boolean; to: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    setBusy(true);
    const r = await requestPasswordReset(email, { isAdmin });
    setBusy(false);
    if ("error" in r) return toast.error(r.error);
    setResult({ url: r.resetUrl, emailed: r.emailed, to: email });
    toast.success(r.emailed ? "Reset link emailed" : "Reset link generated");
  };

  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className={`inline-flex items-center gap-2 chip mb-3 ${isAdmin ? "bg-ink text-paper" : "bg-pop-yellow"}`}>
            <KeyRound size={12}/> Password recovery
          </div>
          <h1 className="text-5xl">Forgot password</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isAdmin ? "Admin accounts only." : "We'll send a secure reset link to your inbox."}
          </p>
        </motion.div>

        {!result ? (
          <form onSubmit={submit} className={`sticker rounded-2xl p-6 space-y-4 ${isAdmin ? "bg-ink text-paper" : "bg-white"}`}>
            <div className={`rounded-xl border-[3px] px-3 py-2 text-[11px] flex items-center gap-2 ${
              isAdmin ? "border-paper/30 bg-paper/5" : "border-ink/20 bg-pop-yellow/30"
            }`}>
              {emailReady ? <MailCheck size={14}/> : <Settings size={14}/>}
              <span>
                {emailReady
                  ? <>Delivery via <b>{cfg.provider}</b> ({cfg.fromEmail})</>
                  : <>Email delivery not configured — link will be shown after submit.</>}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Mail size={12}/> Email</label>
              <input
                required type="email" autoFocus autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border-[3px] px-4 py-3 outline-none ${
                  isAdmin ? "border-paper bg-paper text-ink" : "border-ink bg-white focus:bg-pop-yellow/30"
                } transition`}
              />
            </div>

            <button disabled={busy} className={`w-full justify-center inline-flex items-center gap-2 rounded-full border-[3px] font-bold px-5 py-3 disabled:opacity-60 ${
              isAdmin ? "border-paper bg-pop-yellow text-ink" : "btn-pop"
            }`}>
              {busy ? "Sending…" : emailReady ? "Email reset link" : "Generate reset link"}
            </button>

            <button type="button" onClick={() => navigate({ to: isAdmin ? "/admin/login" as any : "/login" })}
              className={`w-full text-sm font-semibold inline-flex items-center justify-center gap-1 ${isAdmin ? "text-paper/80" : "text-muted-foreground"} hover:underline`}>
              <ArrowLeft size={14}/> Back to sign in
            </button>
          </form>
        ) : result.emailed ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className={`sticker rounded-2xl p-6 space-y-3 ${isAdmin ? "bg-ink text-paper" : "bg-pop-yellow"}`}>
            <div className="flex items-center gap-2 font-bold"><MailCheck size={18}/> Email sent</div>
            <p className="text-sm">
              We've sent a reset link to <span className="font-mono font-bold">{result.to}</span>.
              The link expires in 30 minutes. Check your spam folder if it doesn't show up.
            </p>
            <Link to={isAdmin ? "/admin/login" as any : "/login"}
              className={`inline-flex items-center justify-center gap-2 rounded-full border-[3px] font-bold px-5 py-2.5 text-sm ${
                isAdmin ? "border-paper bg-pop-yellow text-ink" : "border-ink bg-white text-ink"
              }`}>
              <ArrowLeft size={14}/> Back to sign in
            </Link>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className={`sticker rounded-2xl p-6 space-y-4 ${isAdmin ? "bg-ink text-paper" : "bg-pop-yellow"}`}>
            <div className="flex items-center gap-2 font-bold"><ShieldCheck size={16}/> Reset link ready</div>
            <p className="text-sm">
              Email delivery isn't configured. Copy the link below to reset your password — it expires in 30 minutes.
            </p>
            <div className={`rounded-xl border-[3px] p-3 text-xs break-all font-mono ${isAdmin ? "border-paper bg-paper text-ink" : "border-ink bg-white"}`}>
              {result.url}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(result.url); toast.success("Link copied"); }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-ink bg-white text-ink font-bold px-4 py-2.5 text-sm"
              >
                <Copy size={14}/> Copy link
              </button>
              <a href={result.url}
                className="flex-1 inline-flex items-center justify-center rounded-full border-[3px] border-ink bg-pop-pink text-white font-bold px-4 py-2.5 text-sm">
                Open reset page
              </a>
            </div>
          </motion.div>
        )}
      </section>
    </Layout>
  );
}
