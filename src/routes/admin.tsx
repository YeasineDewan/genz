import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import {
  useProducts, useUser, saveProduct, deleteProduct, formatPrice,
  useCategories, saveCategory, deleteCategory,
  useOrders, updateOrderStatus, updateOrderShipping,
  useFunnelEvents, useStockAudit,
  useCoupons, saveCoupon, deleteCoupon,
  useReviews, setReviewStatus, deleteReview,
} from "@/lib/store";
import type { Product, CategoryDef, OrderStatus, Order, StockAuditEntry, Coupon, Review, ReviewStatus, VariantStock } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import {
  Pencil, Trash2, Plus, X, LayoutDashboard, Package, Tag, Truck, Boxes,
  TrendingUp, ShoppingBag, Users, DollarSign, AlertTriangle, ArrowUp, ArrowDown,
  ImagePlus, GripVertical, History, Save, Edit3, Ticket, MessageSquare, Eye, EyeOff, Flag, Check,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — GenZ" }] }),
  component: Admin,
});

type Tab = "dashboard" | "products" | "categories" | "orders" | "inventory" | "coupons" | "reviews";

const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "products", label: "Products", Icon: Package },
  { key: "categories", label: "Categories", Icon: Tag },
  { key: "orders", label: "Orders", Icon: Truck },
  { key: "inventory", label: "Inventory", Icon: Boxes },
  { key: "coupons", label: "Coupons", Icon: Ticket },
  { key: "reviews", label: "Reviews", Icon: MessageSquare },
];

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

      {/* Conversion funnel — last 7 days */}
      <div className="sticker rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-2xl">Conversion — last 7 days</h3>
          <span className="chip bg-pop-cyan">Overall {stats.overall.toFixed(1)}%</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <FunnelStage label="Cart views" value={stats.cartViews} pct={100} bg="bg-pop-yellow"/>
          <FunnelStage label="Checkouts started" value={stats.checkouts} pct={stats.cartToCheckout} bg="bg-pop-orange"
            caption={`${stats.cartToCheckout.toFixed(1)}% cart → checkout`}/>
          <FunnelStage label="Orders completed" value={stats.completions} pct={stats.checkoutToOrder} bg="bg-pop-pink" fg="text-white"
            caption={`${stats.checkoutToOrder.toFixed(1)}% checkout → order`}/>
        </div>
        {stats.cartViews === 0 && (
          <p className="text-xs text-muted-foreground mt-4">No funnel activity yet — visit the cart and checkout to start tracking.</p>
        )}
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

function FunnelStage({ label, value, pct, bg, fg, caption }: {
  label: string; value: number; pct: number; bg: string; fg?: string; caption?: string;
}) {
  return (
    <div className={`sticker rounded-2xl p-5 ${bg} ${fg ?? ""}`}>
      <div className="text-xs uppercase font-bold opacity-80">{label}</div>
      <div className="font-display text-4xl mt-1">{value}</div>
      <div className="mt-3 h-2 rounded-full bg-ink/15 overflow-hidden">
        <div className="h-full bg-ink/70" style={{ width: `${Math.min(100, pct)}%` }}/>
      </div>
      {caption && <div className="text-xs font-bold mt-2">{caption}</div>}
    </div>
  );
}

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

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB per file
const MAX_IMAGES = 8;
const MIN_IMAGES = 1;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function ProductDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const categories = useCategories();
  const [p, setP] = useState<Product>({ ...product, images: product.images ?? (product.image ? [product.image] : []) });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): { ok: boolean; errs: Record<string, string> } => {
    const errs: Record<string, string> = {};
    if (!p.name.trim()) errs.name = "Name is required";
    else if (p.name.length > 80) errs.name = "Name must be ≤ 80 chars";
    if (!p.description.trim()) errs.description = "Description is required";
    else if (p.description.length > 1000) errs.description = "Description must be ≤ 1000 chars";
    if (!(p.price > 0)) errs.price = "Price must be greater than 0";
    if (!Number.isFinite(p.stock) || p.stock < 0) errs.stock = "Stock must be 0 or more";
    if (!p.category) errs.category = "Category is required";
    if (p.colors.length === 0) errs.colors = "At least one color required";
    if (p.sizes.length === 0) errs.sizes = "At least one size required";
    const imgs = p.images ?? [];
    if (imgs.length < MIN_IMAGES) errs.images = `At least ${MIN_IMAGES} image required`;
    else if (imgs.length > MAX_IMAGES) errs.images = `Max ${MAX_IMAGES} images allowed`;
    return { ok: Object.keys(errs).length === 0, errs };
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, errs } = validate();
    setErrors(errs);
    if (!ok) {
      toast.error(Object.values(errs)[0] ?? "Please fix the errors");
      return;
    }
    const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const images = p.images ?? [];
    const image = images[0];
    saveProduct(
      { ...p, slug, image, images },
      { stockSource: product.name ? "product_edit" : "product_create", stockNote: `Saved by admin` },
    );
    toast.success("Saved");
    onClose();
  };

  const onFiles = (files: FileList) => {
    const arr = Array.from(files);
    const current = p.images ?? [];
    const accepted: File[] = [];
    const skipped: string[] = [];
    arr.forEach((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) { skipped.push(`${f.name}: unsupported type`); return; }
      if (f.size > MAX_IMAGE_BYTES) { skipped.push(`${f.name}: over 2MB`); return; }
      accepted.push(f);
    });
    const room = MAX_IMAGES - current.length;
    if (accepted.length > room) {
      skipped.push(`${accepted.length - room} extra dropped (max ${MAX_IMAGES})`);
      accepted.length = room;
    }
    if (skipped.length) toast.error(skipped.join(" · "));
    if (accepted.length === 0) return;
    Promise.all(accepted.map((f) => new Promise<string>((res) => {
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
          <Field label="Name" error={errors.name}><input value={p.name} onChange={(e)=>setP({...p,name:e.target.value})} className="inp" maxLength={80}/></Field>
          <Field label="Slug (url)"><input value={p.slug} onChange={(e)=>setP({...p,slug:e.target.value})} placeholder="auto-generated" className="inp"/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" error={errors.price}><input type="number" step="0.01" min="0" value={p.price} onChange={(e)=>setP({...p,price:+e.target.value})} className="inp"/></Field>
            <Field label="Stock" error={errors.stock}><input type="number" min="0" value={p.stock} onChange={(e)=>setP({...p,stock:+e.target.value})} className="inp"/></Field>
          </div>
          <Field label="Category" error={errors.category}>
            <select value={p.category} onChange={(e)=>setP({...p,category:e.target.value})} className="inp">
              <option value="">— select —</option>
              {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Colors (comma-separated)" error={errors.colors}>
            <input value={p.colors.join(",")} onChange={(e)=>setP({...p,colors:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="inp"/>
          </Field>
          <Field label="Sizes (comma-separated)" error={errors.sizes}>
            <input value={p.sizes.join(",")} onChange={(e)=>setP({...p,sizes:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} className="inp"/>
          </Field>
          <Field label="Badge (optional)">
            <input value={p.badge ?? ""} onChange={(e)=>setP({...p,badge:e.target.value || undefined})} className="inp"/>
          </Field>
          <Field label="Description" error={errors.description}>
            <textarea value={p.description} onChange={(e)=>setP({...p,description:e.target.value})} className="inp min-h-24" maxLength={1000}/>
            <div className="text-[10px] text-muted-foreground mt-1 text-right">{p.description.length}/1000</div>
          </Field>

          <Field label={`Images (${(p.images ?? []).length}/${MAX_IMAGES} — first = cover)`} error={errors.images}>
            <label className="block border-[3px] border-dashed border-ink rounded-xl p-4 text-center bg-white cursor-pointer hover:bg-pop-yellow/30">
              <input type="file" multiple accept={ACCEPTED_TYPES.join(",")} className="hidden"
                onChange={(e) => e.target.files && onFiles(e.target.files)}/>
              <ImagePlus className="mx-auto mb-1"/>
              <div className="text-sm font-bold">Upload images</div>
              <div className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF — max 2MB each, up to {MAX_IMAGES} total</div>
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
          {filtered.map((o) => <OrderRow key={o.id} o={o}/>)}
        </div>
      )}
    </div>
  );
}

function OrderRow({ o }: { o: Order }) {
  const products = useProducts();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: o.shipping.name,
    address: o.shipping.address,
    city: o.shipping.city,
    zip: o.shipping.zip,
    country: o.shipping.country,
    trackingNumber: o.trackingNumber ?? "",
    carrier: o.carrier ?? "",
  });

  const reset = () => setDraft({
    name: o.shipping.name, address: o.shipping.address, city: o.shipping.city,
    zip: o.shipping.zip, country: o.shipping.country,
    trackingNumber: o.trackingNumber ?? "", carrier: o.carrier ?? "",
  });

  const save = () => {
    if (!draft.name.trim() || !draft.address.trim() || !draft.city.trim() || !draft.zip.trim() || !draft.country.trim()) {
      toast.error("All shipping fields are required");
      return;
    }
    updateOrderShipping(
      o.id,
      { name: draft.name.trim(), address: draft.address.trim(), city: draft.city.trim(), zip: draft.zip.trim(), country: draft.country.trim() },
      draft.trackingNumber.trim(),
      draft.carrier.trim() || undefined,
    );
    toast.success("Order updated");
    setEditing(false);
  };

  return (
    <div className="sticker rounded-2xl bg-white p-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</div>
          {!editing ? (
            <>
              <div className="font-bold text-lg">{o.shipping.name}</div>
              <div className="text-sm text-muted-foreground">{o.shipping.address}, {o.shipping.city} {o.shipping.zip} · {o.shipping.country}</div>
              <div className="text-xs mt-1">
                {new Date(o.createdAt).toLocaleString()}
                {o.trackingNumber ? ` · ${o.carrier ?? ""} ${o.trackingNumber}` : ""}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-w-xl">
              <input value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})} placeholder="Name" className="inp-sm sm:col-span-2"/>
              <input value={draft.address} onChange={(e)=>setDraft({...draft,address:e.target.value})} placeholder="Address" className="inp-sm sm:col-span-2"/>
              <input value={draft.city} onChange={(e)=>setDraft({...draft,city:e.target.value})} placeholder="City" className="inp-sm"/>
              <input value={draft.zip} onChange={(e)=>setDraft({...draft,zip:e.target.value})} placeholder="ZIP" className="inp-sm"/>
              <input value={draft.country} onChange={(e)=>setDraft({...draft,country:e.target.value})} placeholder="Country" className="inp-sm sm:col-span-2"/>
              <input value={draft.carrier} onChange={(e)=>setDraft({...draft,carrier:e.target.value})} placeholder="Carrier" className="inp-sm"/>
              <input value={draft.trackingNumber} onChange={(e)=>setDraft({...draft,trackingNumber:e.target.value})} placeholder="Tracking #" className="inp-sm font-mono"/>
              <div className="sm:col-span-2 flex gap-2">
                <button onClick={save} className="chip bg-pop-pink text-white"><Save size={12}/> Save</button>
                <button onClick={() => { reset(); setEditing(false); }} className="chip">Cancel</button>
              </div>
              <style>{`.inp-sm{border:2px solid var(--ink);border-radius:10px;padding:.4rem .6rem;background:white;outline:none;font-size:.875rem}`}</style>
            </div>
          )}
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
          {!editing && (
            <button onClick={() => setEditing(true)} className="chip mt-2 ml-2"><Edit3 size={12}/> Edit shipping</button>
          )}
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
  );
}

/* ───────────── Inventory ───────────── */

function Inventory() {
  const products = useProducts();
  const audit = useStockAudit();
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [auditFilter, setAuditFilter] = useState("");

  const setQty = (id: string, qty: number) => setEdits((e) => ({ ...e, [id]: qty }));
  const commit = (p: Product) => {
    const next = edits[p.id];
    if (next === undefined || next === p.stock) return;
    const note = notes[p.id]?.trim() || `Manual adjustment (${next - p.stock >= 0 ? "+" : ""}${next - p.stock})`;
    saveProduct({ ...p, stock: Math.max(0, next) }, { stockSource: "manual", stockNote: note });
    setEdits((e) => { const c = { ...e }; delete c[p.id]; return c; });
    setNotes((n) => { const c = { ...n }; delete c[p.id]; return c; });
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

  const filteredAudit = useMemo(() => {
    const q = auditFilter.trim().toLowerCase();
    return q ? audit.filter((a) => a.productName.toLowerCase().includes(q) || a.source.includes(q) || (a.note ?? "").toLowerCase().includes(q)) : audit;
  }, [audit, auditFilter]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total units" value={String(totals.units)} Icon={Boxes} bg="bg-pop-cyan"/>
        <Stat label="Inventory value" value={formatPrice(totals.value)} Icon={DollarSign} bg="bg-pop-yellow"/>
        <Stat label="Low stock" value={String(totals.low)} Icon={AlertTriangle} bg="bg-pop-orange" warn={totals.low > 0}/>
        <Stat label="Out of stock" value={String(totals.out)} Icon={X as any} bg="bg-destructive" fg="text-white" warn={totals.out > 0}/>
      </div>

      <div className="sticker rounded-2xl bg-white overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-pop-yellow border-b-[3px] border-ink">
            <tr>
              <th className="text-left p-3">Product</th>
              <th className="text-left p-3">SKU</th>
              <th className="text-left p-3">Current</th>
              <th className="text-left p-3">Adjust</th>
              <th className="text-left p-3">Note</th>
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
                  <td className="p-3">
                    <input value={notes[p.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                      placeholder="Reason (optional)" className="w-40 border-2 border-ink rounded-lg px-2 py-1 bg-white text-xs"/>
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

      {/* Audit history */}
      <div className="sticker rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-2xl flex items-center gap-2"><History size={20}/> Inventory audit log</h3>
          <input value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} placeholder="Search product, source, note..."
            className="border-2 border-ink rounded-full px-4 py-1.5 text-sm bg-white outline-none"/>
        </div>
        {filteredAudit.length === 0 ? (
          <p className="text-sm text-muted-foreground">{audit.length === 0 ? "No stock changes recorded yet." : "No matching entries."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="text-xs uppercase text-muted-foreground border-b-2 border-ink/20">
                <tr>
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Source</th>
                  <th className="text-right p-2">Before</th>
                  <th className="text-right p-2">Δ</th>
                  <th className="text-right p-2">After</th>
                  <th className="text-left p-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.slice(0, 200).map((e: StockAuditEntry) => (
                  <tr key={e.id} className="border-b border-ink/10">
                    <td className="p-2 whitespace-nowrap text-xs">{new Date(e.at).toLocaleString()}</td>
                    <td className="p-2 font-bold">{e.productName}</td>
                    <td className="p-2"><span className="chip bg-pop-yellow text-xs">{e.source.replace(/_/g, " ")}</span></td>
                    <td className="p-2 text-right font-mono">{e.before}</td>
                    <td className={`p-2 text-right font-bold ${e.delta > 0 ? "text-pop-cyan" : e.delta < 0 ? "text-destructive" : ""}`}>
                      {e.delta > 0 ? `+${e.delta}` : e.delta}
                    </td>
                    <td className="p-2 text-right font-mono">{e.after}</td>
                    <td className="p-2 text-xs text-muted-foreground">{e.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAudit.length > 200 && (
              <div className="text-xs text-muted-foreground mt-2 text-center">Showing latest 200 of {filteredAudit.length} entries.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-bold uppercase mb-1">{label}</div>
      {children}
      {error && <div className="text-xs font-bold text-destructive mt-1">{error}</div>}
    </label>
  );
}
