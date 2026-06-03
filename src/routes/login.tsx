import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { signIn, useUser } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles, ShoppingBag, Heart, Gift } from "lucide-react";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GenZ" }] }),
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" }) as LoginSearch;
  const user = useUser();
  const [form, setForm] = useState({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.isAdmin) navigate({ to: "/admin" });
    else if (search.redirect) window.location.href = search.redirect;
    else navigate({ to: "/account" });
  }, [user, search, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Email and password required");
    setBusy(true);
    setTimeout(() => {
      const r = signIn(form.email.trim(), form.password, remember);
      setBusy(false);
      if ("error" in r) return toast.error(r.error);
      toast.success(`Welcome back, ${r.name.split(" ")[0]} 👋`);
      if (r.isAdmin) navigate({ to: "/admin" });
      else if (search.redirect) window.location.href = search.redirect;
      else navigate({ to: "/account" });
    }, 300);
  };

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-16 grid md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          className="hidden md:block sticker rounded-2xl p-8 bg-pop-yellow space-y-4"
        >
          <div className="inline-flex items-center gap-2 chip bg-ink text-paper">
            <Sparkles size={12}/> Members get more
          </div>
          <h2 className="text-4xl leading-tight">Your closet,<br/> your rules.</h2>
          <ul className="space-y-2 text-sm font-semibold">
            <li className="flex items-center gap-2"><ShoppingBag size={14}/> Fast checkout with saved addresses</li>
            <li className="flex items-center gap-2"><Heart size={14}/> Sync wishlist across devices</li>
            <li className="flex items-center gap-2"><Gift size={14}/> Loyalty points on every order</li>
          </ul>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 chip bg-pop-cyan mb-3">
              <Sparkles size={12}/> Customer sign in
            </div>
            <h1 className="text-5xl">Welcome back</h1>
            <p className="text-muted-foreground mt-2 text-sm">Pick up where you left off.</p>
          </div>

          <form onSubmit={submit} className="sticker rounded-2xl p-6 space-y-4 bg-white">
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
                  aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button disabled={busy} className="btn-pop w-full justify-center disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-sm text-center">
              No account? <Link to="/signup" className="font-bold underline">Create one</Link>
            </p>
            <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck size={10}/> Protected sign-in. Never share your password.
            </p>
          </form>
        </motion.div>
      </section>
    </Layout>
  );
}
