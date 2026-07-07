import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { signIn, useUser } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";

type Search = { redirect?: string };

export const Route = createFileRoute("/admin_/login")({
  head: () => ({ meta: [{ title: "Admin Sign in — GenZ" }, { name: "robots", content: "noindex,nofollow" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/admin_/login" }) as Search;
  const user = useUser();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.isAdmin) navigate({ to: search.redirect ?? "/admin" as any });
    else toast.error("This account doesn't have admin access");
  }, [user, search, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Email and password required");
    setBusy(true);
    const r = await signIn(form.email.trim(), form.password, remember);
    setBusy(false);
    if ("error" in r) return toast.error(r.error);
    if (!r.isAdmin) return toast.error("This account doesn't have admin access");
    toast.success(`Welcome back, ${r.name.split(" ")[0]}`);
    navigate({ to: search.redirect ?? "/admin" as any });
  };


  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 chip bg-ink text-paper mb-3">
            <ShieldCheck size={12}/> Restricted area
          </div>
          <h1 className="text-5xl">Admin portal</h1>
          <p className="text-muted-foreground mt-2 text-sm">Staff access only. All sign-in attempts are monitored.</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="sticker rounded-2xl p-6 space-y-4 bg-ink text-paper"
        >
          <div className="flex items-center gap-2 rounded-xl border-[3px] border-paper/30 bg-paper/5 px-3 py-2 text-xs">
            <AlertTriangle size={14} className="text-pop-yellow"/>
            <span>Unauthorized access is prohibited.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Mail size={12}/> Staff email</label>
            <input
              required type="email" autoComplete="email" autoFocus
              placeholder="admin@genz.shop"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border-[3px] border-paper bg-paper text-ink px-4 py-3 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Lock size={12}/> Password</label>
            <div className="relative">
              <input
                required type={show ? "text" : "password"} autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border-[3px] border-paper bg-paper text-ink px-4 py-3 pr-11 outline-none"
              />
              <button type="button" onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink"
                aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-pop-yellow rounded border-2 border-paper"/>
              Keep me signed in
            </label>
            <Link to="/forgot-password" search={{ admin: true } as any} className="font-bold underline text-paper">
              Forgot password?
            </Link>
          </div>

          <button disabled={busy} className="w-full justify-center inline-flex items-center gap-2 rounded-full border-[3px] border-paper bg-pop-yellow text-ink font-bold px-5 py-3 disabled:opacity-60">
            <KeyRound size={16}/> {busy ? "Verifying…" : "Enter admin"}
          </button>

          <p className="text-[11px] text-center text-paper/70">
            Not staff? <Link to="/login" className="font-bold underline text-paper">Customer sign in</Link>
          </p>
          <p className="text-[11px] text-center text-paper/60">
            First-time setup?{" "}
            <Link to="/admin/setup" className="font-bold underline text-paper">
              Provision first admin
            </Link>
          </p>

        </motion.form>
      </section>
    </Layout>
  );
}
