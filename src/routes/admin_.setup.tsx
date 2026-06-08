import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { signUp, useUser } from "@/lib/store";
import { PasswordStrength, isPasswordAcceptable } from "@/components/PasswordStrength";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, KeyRound,
  AlertTriangle, Check, X,
} from "lucide-react";

export const Route = createFileRoute("/admin_/setup")({
  head: () => ({
    meta: [
      { title: "Provision Admin — GenZ" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSetup,
});

function AdminSetup() {
  const navigate = useNavigate();
  const user = useUser();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const matches = form.password.length > 0 && form.password === form.confirm;
  const strong = isPasswordAcceptable(form.password);
  const canSubmit =
    !!form.name.trim() && !!form.email.trim() && strong && matches && !busy;

  useEffect(() => {
    if (user?.isAdmin) navigate({ to: "/admin" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strong) return toast.error("Choose a stronger password");
    if (!matches) return toast.error("Passwords don't match");
    setBusy(true);
    const r = await signUp(form.email.trim(), form.password, form.name.trim(), {
      claimAdmin: true,
    });
    setBusy(false);
    if ("error" in r) return toast.error(r.error);
    if (!r.isAdmin) {
      toast.error("Admin already exists. Sign in via the admin portal.");
      navigate({ to: "/admin/login" as any });
      return;
    }
    toast.success("Admin provisioned. Welcome aboard.");
    navigate({ to: "/admin" as any });
  };

  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <div className="inline-flex items-center gap-2 chip bg-ink text-paper mb-3">
            <ShieldCheck size={12} /> First-time setup
          </div>
          <h1 className="text-5xl">Provision admin</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Available only until the first administrator is created.
          </p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="sticker rounded-2xl p-6 space-y-4 bg-ink text-paper"
        >
          <div className="flex items-center gap-2 rounded-xl border-[3px] border-paper/30 bg-paper/5 px-3 py-2 text-xs">
            <AlertTriangle size={14} className="text-pop-yellow" />
            <span>
              If an admin already exists this form will not elevate the new
              account — you'll be redirected to the sign-in portal.
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2">
              <UserIcon size={12} /> Full name
            </label>
            <input
              required autoFocus placeholder="Jane Admin"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border-[3px] border-paper bg-paper text-ink px-4 py-3 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2">
              <Mail size={12} /> Staff email
            </label>
            <input
              required type="email" autoComplete="email"
              placeholder="admin@genz.shop"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border-[3px] border-paper bg-paper text-ink px-4 py-3 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2">
              <Lock size={12} /> Password
            </label>
            <div className="relative">
              <input
                required type={show ? "text" : "password"} autoComplete="new-password"
                placeholder="At least 8 characters" minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border-[3px] border-paper bg-paper text-ink px-4 py-3 pr-11 outline-none"
              />
              <button type="button" onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink"
                aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="text-ink">
              <PasswordStrength password={form.password} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2">
              <Lock size={12} /> Confirm password
            </label>
            <input
              required type={show ? "text" : "password"} autoComplete="new-password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full rounded-xl border-[3px] border-paper bg-paper text-ink px-4 py-3 outline-none"
            />
            {form.confirm.length > 0 && (
              <div className={`text-[11px] font-bold flex items-center gap-1 ${matches ? "text-pop-yellow" : "text-pop-pink"}`}>
                {matches ? <><Check size={12} /> Passwords match</> : <><X size={12} /> Passwords don't match</>}
              </div>
            )}
          </div>

          <button disabled={!canSubmit}
            className="w-full justify-center inline-flex items-center gap-2 rounded-full border-[3px] border-paper bg-pop-yellow text-ink font-bold px-5 py-3 disabled:opacity-60 disabled:cursor-not-allowed">
            <KeyRound size={16} /> {busy ? "Provisioning…" : "Create admin account"}
          </button>

          <p className="text-[11px] text-center text-paper/70">
            Already provisioned?{" "}
            <Link to="/admin/login" className="font-bold underline text-paper">
              Admin sign in
            </Link>
          </p>
        </motion.form>
      </section>
    </Layout>
  );
}
