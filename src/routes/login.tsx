import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { signIn, useUser } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";

type LoginSearch = { redirect?: string; admin?: boolean };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GenZ" }] }),
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    admin: s.admin === true || s.admin === "true",
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" }) as LoginSearch;
  const user = useUser();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in? Bounce away from /login.
  useEffect(() => {
    if (!user) return;
    if (search.admin && user.isAdmin) navigate({ to: "/admin" });
    else if (search.redirect) window.location.href = search.redirect;
    else navigate({ to: user.isAdmin ? "/admin" : "/account" });
  }, [user, search, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Email and password required");
    setBusy(true);
    setTimeout(() => {
      const r = signIn(form.email.trim(), form.password);
      setBusy(false);
      if ("error" in r) return toast.error(r.error);
      toast.success(`Welcome back, ${r.name.split(" ")[0]} 👋`);
      if (search.admin && !r.isAdmin) {
        toast.error("This account doesn't have admin access");
        return;
      }
      if (search.admin && r.isAdmin) navigate({ to: "/admin" });
      else if (search.redirect) window.location.href = search.redirect;
      else navigate({ to: r.isAdmin ? "/admin" : "/account" });
    }, 350);
  };

  const isAdminPortal = !!search.admin;

  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          {isAdminPortal ? (
            <>
              <div className="inline-flex items-center gap-2 chip bg-ink text-paper mb-3">
                <ShieldCheck size={12}/> Admin portal
              </div>
              <h1 className="text-5xl">Staff sign in</h1>
              <p className="text-muted-foreground mt-2 text-sm">Restricted access. Authorized accounts only.</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 chip bg-pop-yellow mb-3">
                <Sparkles size={12}/> Welcome back
              </div>
              <h1 className="text-5xl">Sign in</h1>
              <p className="text-muted-foreground mt-2 text-sm">Pick up where you left off.</p>
            </>
          )}
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`sticker rounded-2xl p-6 space-y-4 ${isAdminPortal ? "bg-pop-cyan" : "bg-white"}`}
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Mail size={12}/> Email</label>
            <input
              required type="email" autoComplete="email" autoFocus
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 outline-none focus:bg-pop-yellow/30 transition"
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
                className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 pr-11 outline-none focus:bg-pop-yellow/30 transition"
              />
              <button type="button" onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button disabled={busy} className="btn-pop w-full justify-center disabled:opacity-60">
            {busy ? "Signing in…" : isAdminPortal ? "Enter admin" : "Sign in"}
          </button>

          {!isAdminPortal && (
            <p className="text-sm text-center">
              No account? <Link to="/signup" className="font-bold underline">Sign up</Link>
            </p>
          )}
          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck size={10}/> Protected sign-in. Never share your password.
          </p>
        </motion.form>
      </section>
    </Layout>
  );
}
