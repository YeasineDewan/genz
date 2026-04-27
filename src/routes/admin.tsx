import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useProducts, useUser, saveProduct, deleteProduct, formatPrice } from "@/lib/store";
import type { Product, Category } from "@/lib/types";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — GenZ" }] }),
  component: Admin,
});

const empty = (): Product => ({
  id: crypto.randomUUID(), slug: "", name: "", price: 0, image: "", category: "tops",
  colors: ["pink"], sizes: ["M"], description: "", stock: 10,
});

function Admin() {
  const user = useUser();
  const navigate = useNavigate();
  const products = useProducts();
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
    else if (!user.isAdmin) navigate({ to: "/account" });
  }, [user, navigate]);
  if (!user?.isAdmin) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-5xl">Admin</h1>
            <p className="text-muted-foreground">Manage your catalog. Changes save to local storage (swap for Laravel API later).</p>
          </div>
          <button onClick={() => setEditing(empty())} className="btn-pop"><Plus size={18}/> New product</button>
        </div>

        <div className="sticker rounded-2xl bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-pop-yellow border-b-[3px] border-ink">
              <tr><th className="text-left p-3">Product</th><th className="text-left p-3">Category</th><th className="text-left p-3">Price</th><th className="text-left p-3">Stock</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-ink/20">
                  <td className="p-3 flex items-center gap-3">
                    {p.image && <img src={p.image} className="h-10 w-10 rounded border-2 border-ink object-cover" alt=""/>}
                    <span className="font-bold">{p.name}</span>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{formatPrice(p.price)}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing({ ...p })} className="chip mr-1"><Pencil size={12}/></button>
                    <button onClick={() => { if (confirm("Delete?")) { deleteProduct(p.id); toast.success("Deleted"); } }} className="chip bg-destructive text-white"><Trash2 size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editing && <EditDrawer product={editing} onClose={() => setEditing(null)} />}
      </section>
    </Layout>
  );
}

function EditDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const [p, setP] = useState<Product>(product);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.slug) p.slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    saveProduct(p);
    toast.success("Saved");
    onClose();
  };

  const onFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => setP({ ...p, image: String(r.result) });
    r.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-ink/40" onClick={onClose}/>
      <form onSubmit={save} className="w-full max-w-lg bg-paper border-l-[3px] border-ink overflow-auto">
        <div className="p-4 border-b-[3px] border-ink bg-pop-cyan flex items-center justify-between">
          <h3 className="text-2xl">Edit product</h3>
          <button type="button" onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full border-2 border-ink bg-white"><X size={16}/></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Name"><input required value={p.name} onChange={(e)=>setP({...p,name:e.target.value})} className="inp"/></Field>
          <Field label="Slug (url)"><input value={p.slug} onChange={(e)=>setP({...p,slug:e.target.value})} placeholder="auto-generated" className="inp"/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price"><input required type="number" step="0.01" value={p.price} onChange={(e)=>setP({...p,price:+e.target.value})} className="inp"/></Field>
            <Field label="Stock"><input required type="number" value={p.stock} onChange={(e)=>setP({...p,stock:+e.target.value})} className="inp"/></Field>
          </div>
          <Field label="Category">
            <select value={p.category} onChange={(e)=>setP({...p,category:e.target.value as Category})} className="inp">
              <option value="tops">Tops</option><option value="bottoms">Bottoms</option><option value="shoes">Shoes</option><option value="accessories">Accessories</option>
            </select>
          </Field>
          <Field label="Colors (comma-separated)"><input value={p.colors.join(",")} onChange={(e)=>setP({...p,colors:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="inp"/></Field>
          <Field label="Sizes (comma-separated)"><input value={p.sizes.join(",")} onChange={(e)=>setP({...p,sizes:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="inp"/></Field>
          <Field label="Badge (optional)"><input value={p.badge ?? ""} onChange={(e)=>setP({...p,badge:e.target.value || undefined})} className="inp"/></Field>
          <Field label="Description"><textarea value={p.description} onChange={(e)=>setP({...p,description:e.target.value})} className="inp min-h-24"/></Field>
          <Field label="Image">
            <input type="file" accept="image/*" onChange={(e)=> e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm"/>
            {p.image && <img src={p.image} className="mt-2 h-32 w-32 rounded border-2 border-ink object-cover" alt=""/>}
          </Field>
          <button className="btn-pop w-full justify-center mt-3">Save product</button>
        </div>
        <style>{`.inp{width:100%;border:3px solid var(--ink);border-radius:12px;padding:.6rem .8rem;background:white;outline:none}`}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-bold uppercase mb-1">{label}</div>
      {children}
    </label>
  );
}
