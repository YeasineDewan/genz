import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { resetPasswordWithToken, verifyResetToken } from "@/lib/store";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

type Search = { token?: string; admin?: boolean };

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — GenZ" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" ? s.token : undefined,
    admin: s.admin === true || s.admin === "true",
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/reset-password" }) as Search;
  const isAdmin = !!search.admin;
  const token = search.token ?? "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const verification = useMemo(() => (token ? verifyResetToken(token) : { error: "Missing token" }), [token]);
  const tokenError = "error" in verification ? verification.error : null;

  useEffect(() => {
    if (done) {
      const t = window.setTimeout(() => navigate({ to: isAdmin ? "/admin/login" as any : "/login" }), 2500);
      return () => window.clearTimeout(t);
    }
  }, [done, isAdmin, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    setTimeout(() => {
      const r = resetPasswordWithToken(token, pw);
      setBusy(false);
      if ("error" in r) return toast.error(r.error);
      setDone(true);
      toast.success("Password updated");
    }, 250);
  };

  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className={`inline-flex items-center gap-2 chip mb-3 ${isAdmin ? "bg-ink text-paper" : "bg-pop-cyan"}`}>
            <ShieldCheck size={12}/> Set new password
          </div>
          <h1 className="text-5xl">Reset password</h1>
          {!tokenError && "email" in verification && (
            <p className="text-muted-foreground mt-2 text-sm">For <span className="font-bold">{verification.email}</span></p>
          )}
        </motion.div>

        {tokenError ? (
          <div className="sticker rounded-2xl p-6 space-y-3 bg-pop-pink text-white text-center">
            <AlertTriangle className="mx-auto" size={32}/>
            <h2 className="text-2xl font-bold">{tokenError}</h2>
            <p className="text-sm">Request a fresh reset link.</p>
            <Link to="/forgot-password" search={{ admin: isAdmin } as any}
              className="inline-flex items-center justify-center rounded-full border-[3px] border-ink bg-white text-ink font-bold px-5 py-2.5 text-sm">
              Request new link
            </Link>
          </div>
        ) : done ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="sticker rounded-2xl p-8 bg-pop-yellow text-center space-y-3">
            <CheckCircle2 className="mx-auto" size={40}/>
            <h2 className="text-2xl font-bold">All set!</h2>
            <p className="text-sm">Redirecting you to sign in…</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className={`sticker rounded-2xl p-6 space-y-4 ${isAdmin ? "bg-ink text-paper" : "bg-white"}`}>
            <PwField show={show} setShow={setShow} value={pw} onChange={setPw} label="New password" isAdmin={isAdmin} autoFocus/>
            <PwField show={show} setShow={setShow} value={pw2} onChange={setPw2} label="Confirm password" isAdmin={isAdmin}/>
            <button disabled={busy} className={`w-full justify-center inline-flex items-center gap-2 rounded-full border-[3px] font-bold px-5 py-3 disabled:opacity-60 ${
              isAdmin ? "border-paper bg-pop-yellow text-ink" : "btn-pop"
            }`}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </section>
    </Layout>
  );
}

function PwField({ show, setShow, value, onChange, label, isAdmin, autoFocus }: {
  show: boolean; setShow: (v: boolean) => void; value: string; onChange: (v: string) => void;
  label: string; isAdmin: boolean; autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Lock size={12}/> {label}</label>
      <div className="relative">
        <input
          required type={show ? "text" : "password"} autoComplete="new-password" autoFocus={autoFocus}
          placeholder="At least 6 characters" minLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border-[3px] px-4 py-3 pr-11 outline-none ${
            isAdmin ? "border-paper bg-paper text-ink" : "border-ink bg-white focus:bg-pop-yellow/30"
          } transition`}
        />
        <button type="button" onClick={() => setShow(!show)}
          className={`absolute right-3 top-1/2 -translate-y-1/2 ${isAdmin ? "text-ink/60 hover:text-ink" : "text-muted-foreground hover:text-ink"}`}>
          {show ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  );
}
