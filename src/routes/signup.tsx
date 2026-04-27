import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { signUp } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — GenZ" }] }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = signUp(form.email, form.password, form.name);
    if ("error" in r) return toast.error(r.error);
    toast.success(`Welcome, ${r.name}!`);
    navigate({ to: "/account" });
  };
  return (
    <Layout>
      <section className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-5xl mb-6">Create account</h1>
        <form onSubmit={submit} className="sticker rounded-2xl bg-white p-6 space-y-3">
          <input required placeholder="Your name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border-[3px] border-ink px-4 py-3"/>
          <input required type="email" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="w-full rounded-xl border-[3px] border-ink px-4 py-3"/>
          <input required type="password" placeholder="Password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} className="w-full rounded-xl border-[3px] border-ink px-4 py-3"/>
          <button className="btn-pop w-full justify-center">Sign up</button>
          <p className="text-sm text-center">Already have one? <Link to="/login" className="font-bold underline">Sign in</Link></p>
        </form>
      </section>
    </Layout>
  );
}
