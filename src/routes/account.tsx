import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRequireAuth } from "@/lib/auth-guard";
import { Layout } from "@/components/Layout";
import {
  useUser, useOrders, useProducts, useWishlist, useNotifications,
  useUnreadNotificationCount, useAddresses, usePreferences, useLoyalty,
  useReviews, useAppliedCoupon, useCoupons,
  formatPrice, signOut, updateProfile, changePassword,
  saveAddress, deleteAddress, setDefaultAddress,
  updatePreferences, markNotificationRead, markAllNotificationsRead, clearNotifications,
  cancelOrder, LOYALTY_TIERS,
} from "@/lib/store";
import type { Address, Notification, Order } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Package, MapPin, Heart, Star, Bell, Settings, Shield,
  LogOut, Search, Plus, Pencil, Trash2, Check, ChevronRight, Crown, Tag,
  TrendingUp, ShoppingBag, Calendar, Mail, Phone, Camera, Copy, X,
  AlertCircle, Sparkles, Award, Gift, Download, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { downloadInvoice } from "@/lib/invoice";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account — GenZ" }] }),
  component: AccountPage,
});

type Tab = "overview" | "orders" | "addresses" | "wishlist" | "reviews" | "rewards" | "notifications" | "profile" | "security" | "preferences";

function AccountPage() {
  const user = useRequireAuth({ customer: true });
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  if (!user) return null;

  const tabs: { key: Tab; label: string; Icon: any }[] = [
    { key: "overview", label: "Overview", Icon: LayoutDashboard },
    { key: "orders", label: "Orders", Icon: Package },
    { key: "addresses", label: "Addresses", Icon: MapPin },
    { key: "wishlist", label: "Wishlist", Icon: Heart },
    { key: "reviews", label: "My reviews", Icon: Star },
    { key: "rewards", label: "Rewards", Icon: Crown },
    { key: "notifications", label: "Notifications", Icon: Bell },
    { key: "profile", label: "Profile", Icon: Settings },
    { key: "security", label: "Security", Icon: Shield },
    { key: "preferences", label: "Preferences", Icon: Sparkles },
  ];

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="space-y-2 lg:sticky lg:top-24 lg:self-start">
            <ProfileBadge />
            <nav className="sticker rounded-2xl bg-white p-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ${
                    tab === t.key ? "bg-pop-pink text-white" : "hover:bg-pop-yellow"
                  }`}
                >
                  <t.Icon size={16} />
                  <span className="flex-1 text-left">{t.label}</span>
                  {t.key === "notifications" && <NotifBadge />}
                  <ChevronRight size={14} className="opacity-50" />
                </button>
              ))}
              <button
                onClick={() => { signOut(); navigate({ to: "/" }); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-destructive hover:text-white transition mt-2"
              >
                <LogOut size={16} /> Sign out
              </button>
            </nav>
          </aside>

          <div className="min-w-0">
            {tab === "overview" && <Overview onTab={setTab} />}
            {tab === "orders" && <OrdersTab />}
            {tab === "addresses" && <AddressesTab />}
            {tab === "wishlist" && <WishlistTab />}
            {tab === "reviews" && <ReviewsTab />}
            {tab === "rewards" && <RewardsTab />}
            {tab === "notifications" && <NotificationsTab />}
            {tab === "profile" && <ProfileTab />}
            {tab === "security" && <SecurityTab />}
            {tab === "preferences" && <PreferencesTab />}
          </div>
        </div>
      </section>
    </Layout>
  );
}

/* ---------- Sidebar pieces ---------- */
function ProfileBadge() {
  const user = useUser();
  const loyalty = useLoyalty();
  if (!user) return null;
  return (
    <div className="sticker rounded-2xl bg-pop-pink text-white p-4 flex items-center gap-3">
      <Avatar src={user.avatar} name={user.name} size={48} />
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate">{user.name}</div>
        <div className="text-xs opacity-90 truncate">{user.email}</div>
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-ink/30 rounded-full px-2 py-0.5">
          <Crown size={10}/> {loyalty.tier.name} · {loyalty.points} pts
        </div>
      </div>
    </div>
  );
}

function NotifBadge() {
  const n = useUnreadNotificationCount();
  if (!n) return null;
  return <span className="grid place-items-center min-w-5 h-5 px-1 rounded-full bg-ink text-paper text-[10px]">{n}</span>;
}

function Avatar({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    <img src={src} alt="" width={size} height={size} className="rounded-full border-[3px] border-ink object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full border-[3px] border-ink bg-pop-yellow text-ink grid place-items-center font-display"
         style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

/* ---------- Overview ---------- */
function Overview({ onTab }: { onTab: (t: Tab) => void }) {
  const user = useUser()!;
  const orders = useOrders(user.id);
  const wish = useWishlist();
  const loyalty = useLoyalty();
  const products = useProducts();

  const totalSpent = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const inFlight = orders.filter((o) => ["pending", "processing", "shipped", "out_for_delivery"].includes(o.status));
  const recent = orders.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="sticker rounded-2xl bg-gradient-to-br from-pop-yellow to-pop-orange p-6">
        <div className="text-xs font-bold uppercase tracking-widest opacity-70">Welcome back</div>
        <h1 className="font-display text-4xl">{user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm mt-1 opacity-80">Here's what's happening with your account today.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard Icon={ShoppingBag} label="Orders" value={String(orders.length)} accent="bg-pop-cyan" onClick={() => onTab("orders")}/>
        <StatCard Icon={TrendingUp} label="Total spent" value={formatPrice(totalSpent)} accent="bg-pop-pink text-white"/>
        <StatCard Icon={Heart} label="Wishlist" value={String(wish.length)} accent="bg-pop-yellow" onClick={() => onTab("wishlist")}/>
        <StatCard Icon={Crown} label={`${loyalty.tier.name} tier`} value={`${loyalty.points} pts`} accent="bg-pop-orange" onClick={() => onTab("rewards")}/>
      </div>

      {inFlight.length > 0 && (
        <div className="sticker rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-display text-2xl flex items-center gap-2"><Package size={20}/> In transit</div>
            <button onClick={() => onTab("orders")} className="text-sm font-bold underline">View all</button>
          </div>
          <div className="space-y-2">
            {inFlight.slice(0, 3).map((o) => (
              <Link key={o.id} to="/order/$id" params={{ id: o.id }}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-ink/10 hover:border-ink hover:bg-pop-yellow/40 transition">
                <Package size={20}/>
                <div className="flex-1 min-w-0">
                  <div className="font-bold font-mono text-sm">#{o.id.slice(0,8)}</div>
                  <div className="text-xs text-muted-foreground">{o.items.length} item(s) · {o.trackingNumber}</div>
                </div>
                <span className="chip bg-pop-cyan capitalize">{o.status.replace(/_/g," ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="sticker rounded-2xl bg-white p-4">
          <div className="font-display text-2xl mb-3">Recent orders</div>
          {recent.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No orders yet" cta={<Link to="/shop" className="btn-pop">Start shopping</Link>}/>
          ) : recent.map((o) => (
            <Link key={o.id} to="/order/$id" params={{ id: o.id }}
                  className="flex items-center gap-3 py-2 border-b border-ink/10 last:border-0">
              <div className="flex -space-x-2">
                {o.items.slice(0,2).map((it, i) => {
                  const p = products.find((x) => x.id === it.productId);
                  return p ? <img key={i} src={p.image} className="h-9 w-9 rounded-full border-2 border-ink object-cover" alt=""/> : null;
                })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm font-mono">#{o.id.slice(0,8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="font-display">{formatPrice(o.total)}</div>
            </Link>
          ))}
        </div>

        <LoyaltyMini onTab={onTab}/>
      </div>
    </div>
  );
}

function StatCard({ Icon, label, value, accent, onClick }: any) {
  return (
    <button onClick={onClick} className={`sticker rounded-2xl p-4 text-left transition hover:translate-y-[-2px] ${accent}`}>
      <Icon size={20} />
      <div className="text-xs font-bold uppercase tracking-widest mt-2 opacity-80">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </button>
  );
}

function EmptyState({ icon: Icon, title, hint, cta }: { icon: any; title: string; hint?: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center py-8">
      <Icon size={32} className="mx-auto mb-2 opacity-40" />
      <div className="font-bold">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mt-1">{hint}</div>}
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}

function LoyaltyMini({ onTab }: { onTab: (t: Tab) => void }) {
  const { tier, next, progress, points } = useLoyalty();
  return (
    <div className="sticker rounded-2xl bg-gradient-to-br from-pop-pink to-pop-orange text-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-90">
        <Crown size={14}/> Loyalty status
      </div>
      <div className="font-display text-3xl mt-1">{tier.name}</div>
      <div className="text-sm opacity-90">{points} points</div>
      {next ? (
        <>
          <div className="mt-3 h-2 bg-ink/30 rounded-full overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs mt-1 opacity-90">{next.min - points} pts to <b>{next.name}</b></div>
        </>
      ) : (
        <div className="mt-3 text-xs opacity-90">You've reached the top tier 🏆</div>
      )}
      <button onClick={() => onTab("rewards")} className="mt-3 inline-flex items-center gap-1 font-bold text-sm underline">
        See perks <ChevronRight size={14}/>
      </button>
    </div>
  );
}

/* ---------- Orders ---------- */
function OrdersTab() {
  const user = useUser()!;
  const orders = useOrders(user.id);
  const products = useProducts();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => orders.filter((o) => {
    if (status !== "all" && o.status !== status) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return o.id.toLowerCase().includes(s)
      || (o.trackingNumber ?? "").toLowerCase().includes(s)
      || o.items.some((it) => products.find((p) => p.id === it.productId)?.name.toLowerCase().includes(s));
  }), [orders, q, status, products]);

  return (
    <div className="space-y-4">
      <PageHeader title="Your orders" subtitle={`${orders.length} total`} />
      <div className="sticker rounded-2xl bg-white p-3 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 rounded-xl border-2 border-ink/20">
          <Search size={16}/>
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search order #, tracking, product..." className="flex-1 bg-transparent py-2 outline-none text-sm"/>
        </div>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-xl border-2 border-ink/20 px-3 py-2 text-sm font-bold bg-white">
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="sticker rounded-2xl bg-white p-10">
          <EmptyState icon={Package} title="No orders match" cta={<Link to="/shop" className="btn-pop">Browse shop</Link>}/>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => <OrderRow key={o.id} order={o}/>)}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order: o }: { order: Order }) {
  const products = useProducts();
  const canCancel = ["pending", "processing"].includes(o.status);
  return (
    <div className="sticker rounded-2xl bg-white p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex -space-x-3">
          {o.items.slice(0,4).map((it, i) => {
            const p = products.find((x) => x.id === it.productId);
            return p ? <img key={i} src={p.image} className="h-12 w-12 rounded-full border-[3px] border-ink object-cover" alt=""/> : null;
          })}
          {o.items.length > 4 && <div className="h-12 w-12 rounded-full border-[3px] border-ink bg-white grid place-items-center text-xs font-bold">+{o.items.length-4}</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold font-mono text-sm">#{o.id.slice(0,8)}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span><Calendar size={10} className="inline"/> {new Date(o.createdAt).toLocaleDateString()}</span>
            <span>· {o.items.length} item(s)</span>
            {o.trackingNumber && <span>· {o.trackingNumber}</span>}
          </div>
        </div>
        <span className={`chip capitalize ${
          o.status === "delivered" ? "bg-green-200" :
          o.status === "cancelled" ? "bg-destructive text-white" :
          o.status === "shipped" || o.status === "out_for_delivery" ? "bg-pop-cyan" :
          "bg-pop-yellow"
        }`}>{o.status.replace(/_/g," ")}</span>
        <div className="font-display text-xl">{formatPrice(o.total)}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to="/order/$id" params={{ id: o.id }} className="btn-pop text-sm py-1.5 px-3">
          Track <ExternalLink size={14}/>
        </Link>
        {o.trackingNumber && (
          <button onClick={() => { navigator.clipboard.writeText(o.trackingNumber!); toast.success("Tracking copied"); }}
                  className="text-sm font-bold px-3 py-1.5 rounded-full border-2 border-ink hover:bg-pop-yellow inline-flex items-center gap-1">
            <Copy size={14}/> Copy tracking
          </button>
        )}
        {canCancel && (
          <button onClick={() => { if (confirm("Cancel this order?")) { cancelOrder(o.id, "Cancelled by customer"); toast.success("Order cancelled"); } }}
                  className="text-sm font-bold px-3 py-1.5 rounded-full border-2 border-ink hover:bg-destructive hover:text-white inline-flex items-center gap-1">
            <X size={14}/> Cancel
          </button>
        )}
        {o.status === "delivered" && (
          <button onClick={() => toast.success("Invoice download coming soon")} className="text-sm font-bold px-3 py-1.5 rounded-full border-2 border-ink hover:bg-pop-yellow inline-flex items-center gap-1">
            <Download size={14}/> Invoice
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Addresses ---------- */
function AddressesTab() {
  const list = useAddresses();
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader title="Addresses" subtitle="Saved shipping destinations" right={
        <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-pop text-sm py-2 px-4"><Plus size={14}/> Add address</button>
      }/>
      {list.length === 0 ? (
        <div className="sticker rounded-2xl bg-white p-10">
          <EmptyState icon={MapPin} title="No saved addresses" hint="Add one for faster checkout"
                      cta={<button onClick={() => { setEditing(null); setOpen(true); }} className="btn-pop">Add address</button>}/>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((a) => (
            <div key={a.id} className="sticker rounded-2xl bg-white p-4 relative">
              <div className="flex items-start gap-2">
                <MapPin size={18} className="mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <div className="font-bold flex items-center gap-2">
                    {a.label || "Address"}
                    {a.isDefault && <span className="chip bg-pop-yellow text-[10px]">Default</span>}
                  </div>
                  <div className="text-sm">{a.name}</div>
                  <div className="text-sm text-muted-foreground">{a.address}, {a.city} {a.zip}, {a.country}</div>
                  {a.phone && <div className="text-xs text-muted-foreground mt-1">📞 {a.phone}</div>}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {!a.isDefault && (
                  <button onClick={() => { setDefaultAddress(a.id); toast.success("Default updated"); }}
                          className="text-xs font-bold px-2 py-1 rounded-full border-2 border-ink hover:bg-pop-yellow">Set default</button>
                )}
                <button onClick={() => { setEditing(a); setOpen(true); }} className="text-xs font-bold px-2 py-1 rounded-full border-2 border-ink hover:bg-pop-cyan inline-flex items-center gap-1">
                  <Pencil size={12}/> Edit
                </button>
                <button onClick={() => { if (confirm("Delete address?")) { deleteAddress(a.id); toast.success("Deleted"); } }}
                        className="text-xs font-bold px-2 py-1 rounded-full border-2 border-ink hover:bg-destructive hover:text-white inline-flex items-center gap-1">
                  <Trash2 size={12}/> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <AddressDialog initial={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function AddressDialog({ initial, onClose }: { initial: Address | null; onClose: () => void }) {
  const [a, setA] = useState<Address>(initial ?? {
    id: crypto.randomUUID(), label: "Home", name: "", phone: "", address: "", city: "", zip: "", country: "USA", isDefault: false,
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!a.name || !a.address || !a.city || !a.zip) { toast.error("Fill all required fields"); return; }
    saveAddress(a);
    toast.success(initial ? "Address updated" : "Address added");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <form onClick={(e)=>e.stopPropagation()} onSubmit={submit} className="sticker rounded-2xl bg-white p-5 w-full max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl">{initial ? "Edit address" : "New address"}</div>
          <button type="button" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full border-2 border-ink"><X size={16}/></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Label">
            <input value={a.label ?? ""} onChange={(e)=>setA({...a, label: e.target.value})} placeholder="Home, Work…" className="input"/>
          </Field>
          <Field label="Full name *">
            <input value={a.name} onChange={(e)=>setA({...a, name: e.target.value})} required className="input"/>
          </Field>
          <Field label="Phone">
            <input value={a.phone ?? ""} onChange={(e)=>setA({...a, phone: e.target.value})} className="input"/>
          </Field>
          <Field label="Country">
            <input value={a.country} onChange={(e)=>setA({...a, country: e.target.value})} className="input"/>
          </Field>
          <Field label="Street address *" full>
            <input value={a.address} onChange={(e)=>setA({...a, address: e.target.value})} required className="input"/>
          </Field>
          <Field label="City *">
            <input value={a.city} onChange={(e)=>setA({...a, city: e.target.value})} required className="input"/>
          </Field>
          <Field label="ZIP *">
            <input value={a.zip} onChange={(e)=>setA({...a, zip: e.target.value})} required className="input"/>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={!!a.isDefault} onChange={(e)=>setA({...a, isDefault: e.target.checked})}/>
          Set as default
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full border-2 border-ink font-bold">Cancel</button>
          <button type="submit" className="btn-pop">Save address</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ---------- Wishlist ---------- */
function WishlistTab() {
  const wish = useWishlist();
  const products = useProducts();
  const items = wish.map((id) => products.find((p) => p.id === id)).filter(Boolean) as any[];
  return (
    <div className="space-y-4">
      <PageHeader title="Wishlist" subtitle={`${items.length} saved`} right={
        <Link to="/wishlist" className="btn-pop text-sm py-2 px-4">Open full wishlist <ExternalLink size={14}/></Link>
      }/>
      {items.length === 0 ? (
        <div className="sticker rounded-2xl bg-white p-10">
          <EmptyState icon={Heart} title="Empty wishlist" cta={<Link to="/shop" className="btn-pop">Discover products</Link>}/>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.slice(0, 9).map((p) => (
            <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="sticker rounded-2xl bg-white p-3 hover:translate-y-[-2px] transition">
              <img src={p.image} className="rounded-xl w-full aspect-square object-cover border-2 border-ink" alt={p.name}/>
              <div className="font-bold mt-2 truncate">{p.name}</div>
              <div className="font-display">{formatPrice(p.price)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- My reviews ---------- */
function ReviewsTab() {
  const user = useUser()!;
  const all = useReviews();
  const products = useProducts();
  const mine = all.filter((r) => r.userId === user.id);
  return (
    <div className="space-y-4">
      <PageHeader title="My reviews" subtitle={`${mine.length} review(s)`}/>
      {mine.length === 0 ? (
        <div className="sticker rounded-2xl bg-white p-10">
          <EmptyState icon={Star} title="No reviews yet" hint="Write a review on any product you bought" cta={<Link to="/account" className="btn-pop">View orders</Link>}/>
        </div>
      ) : mine.map((r) => {
        const p = products.find((x) => x.id === r.productId);
        return (
          <div key={r.id} className="sticker rounded-2xl bg-white p-4">
            <div className="flex items-start gap-3">
              {p && <img src={p.image} className="h-14 w-14 rounded-xl border-2 border-ink object-cover" alt=""/>}
              <div className="flex-1 min-w-0">
                <div className="font-bold">{p?.name ?? "Product"}</div>
                <div className="flex items-center gap-1 text-pop-orange">
                  {Array.from({length: 5}).map((_,i)=> <Star key={i} size={14} className={i < r.rating ? "fill-current" : "opacity-30"}/>)}
                  <span className="text-xs text-muted-foreground ml-2">{new Date(r.at).toLocaleDateString()}</span>
                </div>
                <div className="font-bold mt-1">{r.title}</div>
                <p className="text-sm text-muted-foreground">{r.body}</p>
                {r.status === "pending" && <span className="chip bg-pop-yellow mt-2 inline-block">Awaiting moderation</span>}
                {r.status === "hidden" && <span className="chip bg-destructive text-white mt-2 inline-block">Hidden by moderator</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Rewards ---------- */
function RewardsTab() {
  const { tier, next, progress, points } = useLoyalty();
  const coupons = useCoupons().filter((c) => c.active && (!c.expiresAt || c.expiresAt > Date.now()));
  return (
    <div className="space-y-4">
      <PageHeader title="Rewards & loyalty" subtitle={`${points} points · ${tier.name} tier`}/>
      <div className="sticker rounded-2xl bg-gradient-to-br from-pop-pink to-pop-orange text-white p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-90"><Award size={14}/> Current tier</div>
        <div className="font-display text-5xl mt-1">{tier.name}</div>
        {next ? (
          <>
            <div className="mt-4 h-3 bg-ink/30 rounded-full overflow-hidden border-2 border-ink">
              <div className="h-full bg-white" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-sm mt-2">{next.min - points} more pts → <b>{next.name}</b></div>
          </>
        ) : <div className="mt-2 text-sm">Top tier unlocked 🏆</div>}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {LOYALTY_TIERS.map((t) => (
          <div key={t.name} className={`sticker rounded-2xl p-4 ${t.color} ${tier.name === t.name ? "ring-4 ring-ink" : ""}`}>
            <div className="font-display text-2xl">{t.name}</div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-70">{t.min}+ pts</div>
            <ul className="mt-2 space-y-1 text-sm">
              {t.perks.map((p) => <li key={p} className="flex items-center gap-2"><Check size={14}/> {p}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {coupons.length > 0 && (
        <div className="sticker rounded-2xl bg-white p-4">
          <div className="font-display text-2xl mb-3 flex items-center gap-2"><Gift size={20}/> Available promo codes</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {coupons.map((c) => (
              <div key={c.id} className="border-2 border-dashed border-ink rounded-xl p-3 flex items-center gap-3 bg-pop-yellow/40">
                <Tag size={18}/>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold">{c.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.type === "percent" ? `${c.value}% off` : `${formatPrice(c.value)} off`}
                    {c.minSubtotal ? ` · min ${formatPrice(c.minSubtotal)}` : ""}
                  </div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Code copied"); }}
                        className="text-xs font-bold px-2 py-1 rounded-full border-2 border-ink hover:bg-white inline-flex items-center gap-1">
                  <Copy size={12}/> Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Notifications ---------- */
function NotificationsTab() {
  const list = useNotifications();
  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" subtitle={`${list.filter(n=>!n.read).length} unread`} right={
        <div className="flex gap-2">
          <button onClick={() => { markAllNotificationsRead(); toast.success("All marked read"); }} className="text-sm font-bold px-3 py-1.5 rounded-full border-2 border-ink hover:bg-pop-yellow">Mark all read</button>
          <button onClick={() => { if (confirm("Clear all?")) clearNotifications(); }} className="text-sm font-bold px-3 py-1.5 rounded-full border-2 border-ink hover:bg-destructive hover:text-white">Clear</button>
        </div>
      }/>
      {list.length === 0 ? (
        <div className="sticker rounded-2xl bg-white p-10">
          <EmptyState icon={Bell} title="No notifications yet" hint="Updates about your orders & promos appear here"/>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((n) => <NotifRow key={n.id} n={n}/>)}
        </div>
      )}
    </div>
  );
}

function NotifRow({ n }: { n: Notification }) {
  const dot = n.kind === "order" ? "bg-pop-cyan" : n.kind === "promo" ? "bg-pop-yellow" : n.kind === "review" ? "bg-pop-orange" : "bg-muted";
  const Wrap: any = n.href ? Link : "div";
  const wrapProps: any = n.href ? { to: n.href } : {};
  return (
    <Wrap {...wrapProps} onClick={() => markNotificationRead(n.id, true)}
          className={`sticker rounded-2xl bg-white p-4 flex items-start gap-3 ${!n.read ? "ring-2 ring-pop-pink" : ""}`}>
      <div className={`h-8 w-8 rounded-full grid place-items-center border-2 border-ink ${dot}`}><Bell size={14}/></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-bold">{n.title}</div>
          {!n.read && <span className="h-2 w-2 rounded-full bg-pop-pink"/>}
        </div>
        {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
        <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.at).toLocaleString()}</div>
      </div>
    </Wrap>
  );
}

/* ---------- Profile ---------- */
function ProfileTab() {
  const user = useUser()!;
  const [form, setForm] = useState({
    name: user.name, email: user.email, phone: user.phone ?? "",
    bio: user.bio ?? "", birthday: user.birthday ?? "", avatar: user.avatar ?? "",
  });
  const dirty = JSON.stringify(form) !== JSON.stringify({
    name: user.name, email: user.email, phone: user.phone ?? "",
    bio: user.bio ?? "", birthday: user.birthday ?? "", avatar: user.avatar ?? "",
  });

  const onAvatar = (file: File) => {
    if (file.size > 1024 * 1024) { toast.error("Image must be < 1MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatar: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" subtitle="Personal information"/>
      <div className="sticker rounded-2xl bg-white p-5 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar src={form.avatar} name={form.name} size={72}/>
          <div>
            <label className="btn-pop text-sm py-2 px-3 cursor-pointer">
              <Camera size={14}/> Change photo
              <input type="file" accept="image/*" hidden onChange={(e)=> e.target.files?.[0] && onAvatar(e.target.files[0])}/>
            </label>
            {form.avatar && <button onClick={()=>setForm({...form, avatar: ""})} className="ml-2 text-sm font-bold underline">Remove</button>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"><input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="input"/></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} className="input"/></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} className="input"/></Field>
          <Field label="Birthday"><input type="date" value={form.birthday} onChange={(e)=>setForm({...form, birthday: e.target.value})} className="input"/></Field>
          <Field label="Bio" full><textarea value={form.bio} onChange={(e)=>setForm({...form, bio: e.target.value})} rows={3} className="input"/></Field>
        </div>
        <div className="flex justify-end">
          <button disabled={!dirty} onClick={() => { updateProfile(form); toast.success("Profile updated"); }}
                  className="btn-pop disabled:opacity-50">Save changes</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Security ---------- */
function SecurityTab() {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [cf, setCf] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nw !== cf) { toast.error("Passwords don't match"); return; }
    const r = await changePassword(cur, nw);
    if ("error" in r) { toast.error(r.error); return; }
    toast.success("Password updated"); setCur(""); setNw(""); setCf("");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Security" subtitle="Manage your password and sessions"/>
      <form onSubmit={submit} className="sticker rounded-2xl bg-white p-5 space-y-3 max-w-lg">
        <div className="font-display text-2xl flex items-center gap-2"><Shield size={20}/> Change password</div>
        <Field label="Current password"><input type="password" value={cur} onChange={(e)=>setCur(e.target.value)} required className="input"/></Field>
        <Field label="New password (min 6)"><input type="password" value={nw} onChange={(e)=>setNw(e.target.value)} minLength={6} required className="input"/></Field>
        <Field label="Confirm new password"><input type="password" value={cf} onChange={(e)=>setCf(e.target.value)} minLength={6} required className="input"/></Field>
        <div className="flex justify-end">
          <button className="btn-pop">Update password</button>
        </div>
      </form>
      <div className="sticker rounded-2xl bg-white p-5">
        <div className="font-display text-2xl mb-2 flex items-center gap-2"><AlertCircle size={20}/> Danger zone</div>
        <p className="text-sm text-muted-foreground mb-3">Sign out of this device.</p>
        <button onClick={() => { signOut(); location.href = "/"; }} className="px-4 py-2 rounded-full border-2 border-ink font-bold hover:bg-destructive hover:text-white inline-flex items-center gap-2">
          <LogOut size={14}/> Sign out everywhere
        </button>
      </div>
    </div>
  );
}

/* ---------- Preferences ---------- */
function PreferencesTab() {
  const prefs = usePreferences();
  const Toggle = ({ k, label, hint }: { k: keyof typeof prefs; label: string; hint?: string }) => (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-ink/10 last:border-0">
      <div>
        <div className="font-bold">{label}</div>
        {hint && <div className="text-sm text-muted-foreground">{hint}</div>}
      </div>
      <button type="button" onClick={() => updatePreferences({ [k]: !prefs[k] } as any)}
              className={`relative h-7 w-12 rounded-full border-2 border-ink transition ${prefs[k] ? "bg-pop-pink" : "bg-white"}`}>
        <span className={`absolute top-0.5 ${prefs[k] ? "right-0.5" : "left-0.5"} h-5 w-5 rounded-full bg-white border-2 border-ink transition-all`}/>
      </button>
    </label>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Preferences" subtitle="Notifications, language and display"/>
      <div className="sticker rounded-2xl bg-white p-5">
        <div className="font-display text-2xl mb-2 flex items-center gap-2"><Mail size={20}/> Email & SMS</div>
        <Toggle k="orderUpdates" label="Order updates" hint="Status, shipping and delivery"/>
        <Toggle k="newsletter" label="Newsletter" hint="Weekly drops & curated picks"/>
        <Toggle k="promos" label="Promo offers" hint="Coupon codes and seasonal sales"/>
        <Toggle k="smsAlerts" label="SMS alerts" hint="Time-sensitive shipping pings"/>
      </div>
      <div className="sticker rounded-2xl bg-white p-5">
        <div className="font-display text-2xl mb-2">Display</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Currency">
            <select value={prefs.currency} onChange={(e)=> updatePreferences({ currency: e.target.value })} className="input">
              <option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option>
            </select>
          </Field>
          <Field label="Language">
            <select value={prefs.language} onChange={(e)=> updatePreferences({ language: e.target.value })} className="input">
              <option value="en">English</option><option value="es">Español</option><option value="fr">Français</option>
            </select>
          </Field>
          <Field label="Theme">
            <select value={prefs.theme} onChange={(e)=> updatePreferences({ theme: e.target.value as any })} className="input">
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared ---------- */
function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 className="font-display text-3xl">{title}</h2>
        {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}
