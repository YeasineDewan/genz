import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import {
  useProducts, useUser, saveProduct, deleteProduct, formatPrice,
  useCategories, saveCategory, deleteCategory,
  useOrders, updateOrderStatus, updateOrderShipping,
  useFunnelEvents, useStockAudit,
} from "@/lib/store";
import type { Product, CategoryDef, OrderStatus, Order, StockAuditEntry } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import {
  Pencil, Trash2, Plus, X, LayoutDashboard, Package, Tag, Truck, Boxes,
  TrendingUp, ShoppingBag, Users, DollarSign, AlertTriangle, ArrowUp, ArrowDown,
  ImagePlus, GripVertical, History, Save, Edit3,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — GenZ" }] }),
  component: Admin,
});

type Tab = "dashboard" | "products" | "categories" | "orders" | "inventory";

const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "products", label: "Products", Icon: Package },
  { key: "categories", label: "Categories", Icon: Tag },
  { key: "orders", label: "Orders", Icon: Truck },
  { key: "inventory", label: "Inventory", Icon: Boxes },
];

const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];

function Admin() {
  const user = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    if (!user) navigate({ to: "/login" });
    else if (!user.isAdmin) navigate({ to: "/account" });
  }, [user, navigate]);
  if (!user?.isAdmin) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-5xl">Admin</h1>
          <p className="text-muted-foreground">Manage products, categories, orders, inventory & analytics.</p>
        </div>

        <div className="flex gap-2 flex-wrap mb-6 sticky top-20 z-30 py-2 bg-paper/80 backdrop-blur">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`chip ${tab === t.key ? "bg-pop-pink text-white" : ""}`}>
              <t.Icon size={14}/> {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <Dashboard/>}
        {tab === "products" && <Products/>}
        {tab === "categories" && <Categories/>}
        {tab === "orders" && <Orders/>}
        {tab === "inventory" && <Inventory/>}
      </section>
    </Layout>
  );
}

/* ───────────── Dashboard ───────────── */

function Dashboard() {
  const orders = useOrders();
  const products = useProducts();
  const funnel = useFunnelEvents();

  const stats = useMemo(() => {
    const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    const customers = new Set(orders.map((o) => o.userId)).size;
    const lowStock = products.filter((p) => p.stock <= 5).length;
    const pending = orders.filter((o) => o.status === "pending" || o.status === "processing").length;

    // Sales by day (last 7)
    const days: { label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = d.getTime() + 86400000;
      const total = orders.filter((o) => o.createdAt >= d.getTime() && o.createdAt < next && o.status !== "cancelled")
        .reduce((s, o) => s + o.total, 0);
      days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), total });
    }
    const max = Math.max(1, ...days.map((d) => d.total));

    // Best sellers
    const counts = new Map<string, number>();
    orders.forEach((o) => o.items.forEach((it) => counts.set(it.productId, (counts.get(it.productId) ?? 0) + it.qty)));
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
      .filter((x) => x.product);

    // Conversion funnel — last 7 days
    const weekStart = Date.now() - 7 * 86400000;
    const recent = funnel.filter((f) => f.at >= weekStart);
    const cartViews = recent.filter((f) => f.type === "cart_viewed").length;
    const checkouts = recent.filter((f) => f.type === "checkout_started").length;
    const completions = recent.filter((f) => f.type === "order_completed").length;
    const cartToCheckout = cartViews > 0 ? (checkouts / cartViews) * 100 : 0;
    const checkoutToOrder = checkouts > 0 ? (completions / checkouts) * 100 : 0;
    const overall = cartViews > 0 ? (completions / cartViews) * 100 : 0;

    return { revenue, customers, lowStock, pending, days, max, best,
      cartViews, checkouts, completions, cartToCheckout, checkoutToOrder, overall };
  }, [orders, products, funnel]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Revenue" value={formatPrice(stats.revenue)} Icon={DollarSign} bg="bg-pop-pink" fg="text-white" trend={12}/>
        <Stat label="Orders" value={String(orders.length)} Icon={ShoppingBag} bg="bg-pop-cyan" trend={8}/>
        <Stat label="Customers" value={String(stats.customers)} Icon={Users} bg="bg-pop-yellow" trend={4}/>
        <Stat label="Low stock" value={String(stats.lowStock)} Icon={AlertTriangle} bg="bg-pop-orange" warn={stats.lowStock > 0}/>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="sticker rounded-2xl bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl">Sales — last 7 days</h3>
            <TrendingUp className="text-pop-pink"/>
          </div>
          <div className="flex items-end gap-3 h-48">
            {stats.days.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-bold">{d.total > 0 ? formatPrice(d.total) : ""}</div>
                <div className="w-full rounded-t-lg border-[3px] border-ink bg-pop-pink transition-all"
                  style={{ height: `${(d.total / stats.max) * 100}%`, minHeight: d.total > 0 ? 8 : 4 }}/>
                <div className="text-xs font-bold uppercase">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sticker rounded-2xl bg-pop-yellow p-6">
          <h3 className="text-2xl mb-4">Pending fulfillment</h3>
          <div className="text-6xl font-display">{stats.pending}</div>
          <p className="text-sm mt-2">orders waiting to ship</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="sticker rounded-2xl bg-white p-6">
          <h3 className="text-2xl mb-4">Best sellers</h3>
          {stats.best.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sales yet — place a test order.</p>
          ) : (
            <ol className="space-y-3">
              {stats.best.map(({ product, qty }, i) => product && (
                <li key={product.id} className="flex items-center gap-3">
                  <div className="font-display text-2xl w-8">#{i+1}</div>
                  <img src={product.image} className="h-12 w-12 rounded border-2 border-ink object-cover" alt=""/>
                  <div className="flex-1 min-w-0"><div className="font-bold truncate">{product.name}</div><div className="text-xs text-muted-foreground">{formatPrice(product.price)}</div></div>
                  <div className="chip bg-pop-cyan">{qty} sold</div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="sticker rounded-2xl bg-white p-6">
          <h3 className="text-2xl mb-4">Recent orders</h3>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center gap-3 text-sm border-b border-ink/10 pb-2 last:border-0">
                  <div className="font-mono text-xs">#{o.id.slice(0,8)}</div>
                  <div className="flex-1 truncate">{o.shipping.name}</div>
                  <span className="chip bg-pop-yellow text-xs">{o.status}</span>
                  <div className="font-bold">{formatPrice(o.total)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, Icon, bg, fg, trend, warn }: {
  label: string; value: string; Icon: React.ComponentType<{ size?: number }>;
  bg: string; fg?: string; trend?: number; warn?: boolean;
}) {
  return (
    <div className={`sticker rounded-2xl p-5 ${bg} ${fg ?? ""}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={20}/>
        {trend !== undefined && (
          <span className="text-xs font-bold flex items-center gap-1">
            {trend >= 0 ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}{Math.abs(trend)}%
          </span>
        )}
        {warn && <AlertTriangle size={16}/>}
      </div>
      <div className="font-display text-3xl">{value}</div>
      <div className="text-xs uppercase font-bold opacity-80 mt-1">{label}</div>
    </div>
  );
}

/* ───────────── Products ───────────── */

function emptyProduct(): Product {
  return {
    id: crypto.randomUUID(), slug: "", name: "", price: 0, image: "", images: [],
    category: "tops", colors: ["pink"], sizes: ["M"], description: "", stock: 10,
  };
}

function Products() {
  const products = useProducts();
  const [editing, setEditing] = useState<Product | null>(null);
  const [q, setQ] = useState("");

  const filtered = q ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : products;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..."
          className="rounded-full border-[3px] border-ink bg-white px-5 py-2 outline-none flex-1 max-w-sm"/>
        <button onClick={() => setEditing(emptyProduct())} className="btn-pop"><Plus size={18}/> New product</button>
      </div>

      <div className="sticker rounded-2xl bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-pop-yellow border-b-[3px] border-ink">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Price</th>
              <th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Images</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-ink/20 hover:bg-pop-yellow/10">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {p.image && <img src={p.image} className="h-10 w-10 rounded border-2 border-ink object-cover" alt=""/>}
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">{p.category}</td>
                <td className="p-3 font-bold">{formatPrice(p.price)}</td>
                <td className="p-3">
                  <span className={`chip ${p.stock <= 5 ? "bg-destructive text-white" : p.stock <= 15 ? "bg-pop-orange" : "bg-pop-cyan"}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="p-3">{(p.images?.length ?? (p.image ? 1 : 0))}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => setEditing({ ...p })} className="chip mr-1"><Pencil size={12}/></button>
                  <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) { deleteProduct(p.id); toast.success("Deleted"); } }}
                    className="chip bg-destructive text-white"><Trash2 size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <ProductDrawer product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const categories = useCategories();
  const [p, setP] = useState<Product>({ ...product, images: product.images ?? (product.image ? [product.image] : []) });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const images = p.images ?? [];
    const image = images[0] ?? p.image;
    if (!image) { toast.error("Add at least one image"); return; }
    saveProduct({ ...p, slug, image, images });
    toast.success("Saved");
    onClose();
  };

  const onFiles = (files: FileList) => {
    const arr = Array.from(files);
    Promise.all(arr.map((f) => new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(f);
    }))).then((data) => setP((cur) => ({ ...cur, images: [...(cur.images ?? []), ...data] })));
  };

  const removeImg = (i: number) => setP({ ...p, images: (p.images ?? []).filter((_, j) => j !== i) });
  const moveImg = (i: number, dir: -1 | 1) => {
    const imgs = [...(p.images ?? [])]; const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    setP({ ...p, images: imgs });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-ink/40" onClick={onClose}/>
      <form onSubmit={save} className="w-full max-w-lg bg-paper border-l-[3px] border-ink overflow-auto">
        <div className="p-4 border-b-[3px] border-ink bg-pop-cyan flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-2xl">{product.name ? "Edit product" : "New product"}</h3>
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
            <select value={p.category} onChange={(e)=>setP({...p,category:e.target.value})} className="inp">
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Colors (comma-separated)">
            <input value={p.colors.join(",")} onChange={(e)=>setP({...p,colors:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="inp"/>
          </Field>
          <Field label="Sizes (comma-separated)">
            <input value={p.sizes.join(",")} onChange={(e)=>setP({...p,sizes:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="inp"/>
          </Field>
          <Field label="Badge (optional)">
            <input value={p.badge ?? ""} onChange={(e)=>setP({...p,badge:e.target.value || undefined})} className="inp"/>
          </Field>
          <Field label="Description">
            <textarea value={p.description} onChange={(e)=>setP({...p,description:e.target.value})} className="inp min-h-24"/>
          </Field>

          <Field label="Images (first = cover, drag-reorder w/ arrows)">
            <label className="block border-[3px] border-dashed border-ink rounded-xl p-4 text-center bg-white cursor-pointer hover:bg-pop-yellow/30">
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => e.target.files && onFiles(e.target.files)}/>
              <ImagePlus className="mx-auto mb-1"/>
              <div className="text-sm font-bold">Upload images</div>
              <div className="text-xs text-muted-foreground">PNG, JPG, WEBP — multiple allowed</div>
            </label>
            {(p.images ?? []).length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {(p.images ?? []).map((src, i) => (
                  <div key={i} className="relative group sticker-sm rounded-lg overflow-hidden bg-white">
                    <img src={src} className="aspect-square object-cover w-full" alt=""/>
                    {i === 0 && <span className="absolute top-1 left-1 chip bg-pop-pink text-white text-[10px] px-1.5 py-0">COVER</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-ink/70 opacity-0 group-hover:opacity-100 transition">
                      <button type="button" onClick={()=>moveImg(i,-1)} className="text-white text-xs px-1">◀</button>
                      <GripVertical size={12} className="text-white"/>
                      <button type="button" onClick={()=>moveImg(i,1)} className="text-white text-xs px-1">▶</button>
                    </div>
                    <button type="button" onClick={()=>removeImg(i)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-white border-2 border-ink grid place-items-center"><X size={12}/></button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <button className="btn-pop w-full justify-center mt-3">Save product</button>
        </div>
        <style>{`.inp{width:100%;border:3px solid var(--ink);border-radius:12px;padding:.6rem .8rem;background:white;outline:none}`}</style>
      </form>
    </div>
  );
}

/* ───────────── Categories ───────────── */

function Categories() {
  const cats = useCategories();
  const products = useProducts();
  const [editing, setEditing] = useState<CategoryDef | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing({ id: crypto.randomUUID(), slug: "", name: "", emoji: "" })} className="btn-pop">
          <Plus size={18}/> New category
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c) => {
          const count = products.filter((p) => p.category === c.slug).length;
          return (
            <div key={c.id} className="sticker rounded-2xl bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl">{c.emoji}</div>
                  <h3 className="text-2xl mt-1">{c.name}</h3>
                  <div className="text-xs text-muted-foreground font-mono">/{c.slug}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing({ ...c })} className="chip"><Pencil size={12}/></button>
                  <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) { deleteCategory(c.id); toast.success("Deleted"); } }}
                    className="chip bg-destructive text-white"><Trash2 size={12}/></button>
                </div>
              </div>
              <div className="mt-4 chip bg-pop-yellow">{count} product{count === 1 ? "" : "s"}</div>
            </div>
          );
        })}
      </div>

      {editing && <CategoryDrawer cat={editing} onClose={() => setEditing(null)}/>}
    </div>
  );
}

function CategoryDrawer({ cat, onClose }: { cat: CategoryDef; onClose: () => void }) {
  const [c, setC] = useState<CategoryDef>(cat);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    saveCategory({ ...c, slug });
    toast.success("Saved");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-ink/40" onClick={onClose}/>
      <form onSubmit={save} className="w-full max-w-md bg-paper border-l-[3px] border-ink overflow-auto">
        <div className="p-4 border-b-[3px] border-ink bg-pop-yellow flex items-center justify-between">
          <h3 className="text-2xl">Category</h3>
          <button type="button" onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full border-2 border-ink bg-white"><X size={16}/></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Name"><input required value={c.name} onChange={(e)=>setC({...c,name:e.target.value})} className="inp"/></Field>
          <Field label="Slug"><input value={c.slug} onChange={(e)=>setC({...c,slug:e.target.value})} placeholder="auto" className="inp"/></Field>
          <Field label="Emoji"><input value={c.emoji ?? ""} onChange={(e)=>setC({...c,emoji:e.target.value})} className="inp" maxLength={4}/></Field>
          <button className="btn-pop w-full justify-center mt-3">Save</button>
        </div>
        <style>{`.inp{width:100%;border:3px solid var(--ink);border-radius:12px;padding:.6rem .8rem;background:white;outline:none}`}</style>
      </form>
    </div>
  );
}

/* ───────────── Orders / Delivery ───────────── */

function Orders() {
  const orders = useOrders();
  const products = useProducts();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`chip ${filter === "all" ? "bg-pop-pink text-white" : ""}`}>All ({orders.length})</button>
        {ORDER_STATUSES.map((s) => {
          const n = orders.filter((o) => o.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? "bg-pop-pink text-white" : ""}`}>
              {s.replace(/_/g, " ")} ({n})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="sticker rounded-2xl bg-white p-10 text-center text-muted-foreground">No orders.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="sticker rounded-2xl bg-white p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
                  <div className="font-bold text-lg">{o.shipping.name}</div>
                  <div className="text-sm text-muted-foreground">{o.shipping.address}, {o.shipping.city} {o.shipping.zip}</div>
                  <div className="text-xs mt-1">{new Date(o.createdAt).toLocaleString()}{o.trackingNumber ? ` · ${o.trackingNumber}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl">{formatPrice(o.total)}</div>
                  <select
                    value={o.status}
                    onChange={(e) => { updateOrderStatus(o.id, e.target.value as OrderStatus, "Updated by admin"); toast.success("Status updated"); }}
                    className="mt-2 rounded-full border-[3px] border-ink bg-pop-yellow font-bold text-sm px-3 py-1"
                  >
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.items.map((it, i) => {
                  const p = products.find((x) => x.id === it.productId);
                  if (!p) return null;
                  return (
                    <div key={i} className="flex items-center gap-2 chip bg-pop-cyan/40">
                      <img src={p.image} className="h-6 w-6 rounded-full border border-ink object-cover" alt=""/>
                      <span className="font-bold">{p.name}</span>
                      <span className="text-xs">{it.size} × {it.qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── Inventory ───────────── */

function Inventory() {
  const products = useProducts();
  const [edits, setEdits] = useState<Record<string, number>>({});

  const setQty = (id: string, qty: number) => setEdits((e) => ({ ...e, [id]: qty }));
  const commit = (p: Product) => {
    const next = edits[p.id];
    if (next === undefined || next === p.stock) return;
    saveProduct({ ...p, stock: Math.max(0, next) });
    setEdits((e) => { const c = { ...e }; delete c[p.id]; return c; });
    toast.success(`${p.name} → ${next} in stock`);
  };

  const adjust = (p: Product, delta: number) => {
    const cur = edits[p.id] ?? p.stock;
    setQty(p.id, Math.max(0, cur + delta));
  };

  const totals = useMemo(() => {
    const units = products.reduce((s, p) => s + p.stock, 0);
    const value = products.reduce((s, p) => s + p.stock * p.price, 0);
    const low = products.filter((p) => p.stock <= 5).length;
    const out = products.filter((p) => p.stock === 0).length;
    return { units, value, low, out };
  }, [products]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total units" value={String(totals.units)} Icon={Boxes} bg="bg-pop-cyan"/>
        <Stat label="Inventory value" value={formatPrice(totals.value)} Icon={DollarSign} bg="bg-pop-yellow"/>
        <Stat label="Low stock" value={String(totals.low)} Icon={AlertTriangle} bg="bg-pop-orange" warn={totals.low > 0}/>
        <Stat label="Out of stock" value={String(totals.out)} Icon={X as any} bg="bg-destructive" fg="text-white" warn={totals.out > 0}/>
      </div>

      <div className="sticker rounded-2xl bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-pop-yellow border-b-[3px] border-ink">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">SKU</th>
              <th className="text-left p-3">Current</th>
              <th className="text-left p-3">Adjust</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const draft = edits[p.id];
              const dirty = draft !== undefined && draft !== p.stock;
              return (
                <tr key={p.id} className={`border-b border-ink/20 ${dirty ? "bg-pop-yellow/30" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} className="h-10 w-10 rounded border-2 border-ink object-cover" alt=""/>
                      <div className="font-bold">{p.name}</div>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">{p.slug}</td>
                  <td className="p-3">
                    <span className={`chip ${p.stock === 0 ? "bg-destructive text-white" : p.stock <= 5 ? "bg-pop-orange" : "bg-pop-cyan"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => adjust(p, -1)} className="h-8 w-8 rounded-full border-2 border-ink bg-white font-bold">−</button>
                      <input type="number" value={draft ?? p.stock} onChange={(e) => setQty(p.id, +e.target.value)}
                        className="w-16 text-center border-[3px] border-ink rounded-lg py-1 bg-white"/>
                      <button onClick={() => adjust(p, 1)} className="h-8 w-8 rounded-full border-2 border-ink bg-white font-bold">+</button>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => commit(p)} disabled={!dirty}
                      className="chip bg-pop-pink text-white disabled:opacity-40 disabled:bg-muted disabled:text-muted-foreground">
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
