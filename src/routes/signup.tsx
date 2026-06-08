import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { signUp } from "@/lib/store";
import { PasswordStrength, isPasswordAcceptable } from "@/components/PasswordStrength";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, Eye, EyeOff, Sparkles, ShieldCheck, Check, X } from "lucide-react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — GenZ" }] }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const matches = form.password.length > 0 && form.password === form.confirm;
  const strong = isPasswordAcceptable(form.password);
  const canSubmit = !!form.name.trim() && !!form.email.trim() && strong && matches && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strong) return toast.error("Please choose a stronger password");
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    setBusy(true);
    const r = await signUp(form.email.trim(), form.password, form.name.trim());
    setBusy(false);
    if ("error" in r) return toast.error(r.error);
    toast.success(`Welcome, ${r.name.split(" ")[0]}!`);
    navigate({ to: "/account" });
  };


  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 chip bg-pop-pink text-white mb-3">
            <Sparkles size={12}/> Join the drop
          </div>
          <h1 className="text-5xl">Create account</h1>
          <p className="text-muted-foreground mt-2 text-sm">Wishlist, faster checkout, loyalty points.</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="sticker rounded-2xl p-6 space-y-4 bg-white"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><UserIcon size={12}/> Full name</label>
            <input
              required autoFocus placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 outline-none focus:bg-pop-yellow/30 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Mail size={12}/> Email</label>
            <input
              required type="email" autoComplete="email"
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
                required type={show ? "text" : "password"} autoComplete="new-password"
                placeholder="At least 8 characters" minLength={8}
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
            <PasswordStrength password={form.password}/>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Lock size={12}/> Confirm password</label>
            <input
              required type={show ? "text" : "password"} autoComplete="new-password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 outline-none focus:bg-pop-yellow/30 transition"
            />
            {form.confirm.length > 0 && (
              <div className={`text-[11px] font-bold flex items-center gap-1 ${matches ? "text-emerald-700" : "text-destructive"}`}>
                {matches ? <><Check size={12}/> Passwords match</> : <><X size={12}/> Passwords don't match</>}
              </div>
            )}
          </div>

          <button disabled={!canSubmit} className="btn-pop w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {busy ? "Creating…" : "Create account"}
          </button>

          <p className="text-sm text-center">
            Already have one? <Link to="/login" className="font-bold underline">Sign in</Link>
          </p>
          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <ShieldCheck size={10}/> We never sell your data.
          </p>
        </motion.form>
      </section>
    </Layout>
  );
}
