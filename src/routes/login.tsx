import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { signIn } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GenZ" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = signIn(form.email, form.password);
    if ("error" in r) return toast.error(r.error);
    toast.success(`Welcome back, ${r.name}`);
    navigate({ to: r.isAdmin ? "/admin" : "/account" });
  };
  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-5xl mb-2">Sign in</h1>
        <p className="text-muted-foreground mb-6">Hint: <span className="font-mono">admin@genz.shop / admin123</span></p>
        <form onSubmit={submit} className="sticker rounded-2xl bg-white p-6 space-y-3">
          <input required type="email" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="w-full rounded-xl border-[3px] border-ink px-4 py-3"/>
          <input required type="password" placeholder="Password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} className="w-full rounded-xl border-[3px] border-ink px-4 py-3"/>
          <button className="btn-pop w-full justify-center">Sign in</button>
          <p className="text-sm text-center">No account? <Link to="/signup" className="font-bold underline">Sign up</Link></p>
        </form>
      </section>
    </Layout>
  );
}
