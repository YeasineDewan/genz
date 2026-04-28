// Tiny localStorage-backed store. Swap to a Laravel REST client later by replacing
// the read/write helpers with fetch() calls — public API is stable.
import { useEffect, useState, useCallback, useMemo, useSyncExternalStore } from "react";
import { seedProducts } from "./seed";
import type {
  Product, CartItem, User, Order, CategoryDef, OrderStatus, TrackingEvent,
  FunnelEvent, FunnelEventType, StockAuditEntry, StockChangeSource,
  Review, Coupon,
} from "./types";

const KEYS = {
  products: "genz.products",
  cart: "genz.cart",
  user: "genz.user",
  users: "genz.users",
  orders: "genz.orders",
  categories: "genz.categories",
  funnel: "genz.funnel",
  stockAudit: "genz.stockAudit",
  reviews: "genz.reviews",
  wishlist: "genz.wishlist",
  recent: "genz.recent",
  coupons: "genz.coupons",
} as const;

export const defaultCategories: CategoryDef[] = [
  { id: "c-tops", slug: "tops", name: "Tops", emoji: "👕" },
  { id: "c-bottoms", slug: "bottoms", name: "Bottoms", emoji: "👖" },
  { id: "c-shoes", slug: "shoes", name: "Shoes", emoji: "👟" },
  { id: "c-accessories", slug: "accessories", name: "Accessories", emoji: "🕶️" },
];

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: Listener) => { listeners.add(l); return () => listeners.delete(l); };

// Snapshot cache: keep stable references per key so useSyncExternalStore
// doesn't see a new array/object every render (which would cause an
// infinite "Maximum update depth" loop). We re-parse only when the
// underlying raw JSON string actually changes.
const snapshotCache = new Map<string, { raw: string | null; value: unknown }>();
const SERVER_SNAPSHOT = Symbol("server-snapshot");
const serverSnapshots = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    // Stable per-key fallback for SSR/server snapshot
    if (!serverSnapshots.has(key)) serverSnapshots.set(key, fallback);
    return serverSnapshots.get(key) as T;
  }
  try {
    const raw = localStorage.getItem(key);
    const cached = snapshotCache.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    const value = raw ? (JSON.parse(raw) as T) : fallback;
    snapshotCache.set(key, { raw, value });
    return value;
  } catch { return fallback; }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(val);
  localStorage.setItem(key, raw);
  // Pre-populate cache so the next read returns the same reference
  snapshotCache.set(key, { raw, value: val });
  emit();
}
void SERVER_SNAPSHOT;

const SEED_VERSION = "2";
export function ensureSeeded() {
  if (typeof window === "undefined") return;
  const v = localStorage.getItem("genz.seedVersion");
  if (v !== SEED_VERSION) {
    write(KEYS.products, seedProducts);
    write(KEYS.categories, defaultCategories);
    localStorage.setItem("genz.seedVersion", SEED_VERSION);
  }
  if (!localStorage.getItem(KEYS.users)) {
    write(KEYS.users, [{ id: "admin", email: "admin@genz.shop", password: "admin123", name: "Admin", isAdmin: true }]);
  }
}

// --- Categories ---
export const getCategories = (): CategoryDef[] => read(KEYS.categories, defaultCategories);
export const saveCategory = (c: CategoryDef) => {
  const list = getCategories();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c; else list.push(c);
  write(KEYS.categories, list);
};
export const deleteCategory = (id: string) => write(KEYS.categories, getCategories().filter((c) => c.id !== id));

// --- Products ---
export const getProducts = (): Product[] => read(KEYS.products, seedProducts);
export const getProduct = (slug: string) => getProducts().find((p) => p.slug === slug);
export const saveProduct = (
  p: Product,
  opts?: { stockSource?: StockChangeSource; stockNote?: string; actor?: string },
) => {
  const list = getProducts();
  const i = list.findIndex((x) => x.id === p.id);
  const prev = i >= 0 ? list[i] : null;
  if (i >= 0) list[i] = p; else list.push(p);
  write(KEYS.products, list);
  // Audit stock changes
  const before = prev ? prev.stock : 0;
  const after = p.stock;
  if (before !== after) {
    appendStockAudit({
      id: crypto.randomUUID(),
      productId: p.id,
      productName: p.name,
      before,
      after,
      delta: after - before,
      source: opts?.stockSource ?? (prev ? "manual" : "product_create"),
      note: opts?.stockNote,
      actor: opts?.actor,
      at: Date.now(),
    });
  }
};
export const deleteProduct = (id: string) => write(KEYS.products, getProducts().filter((p) => p.id !== id));

// --- Cart ---
export const getCart = (): CartItem[] => read(KEYS.cart, []);
export const setCart = (c: CartItem[]) => write(KEYS.cart, c);
export const addToCart = (item: CartItem) => {
  const c = getCart();
  const idx = c.findIndex((i) => i.productId === item.productId && i.size === item.size && i.color === item.color);
  if (idx >= 0) c[idx].qty += item.qty; else c.push(item);
  setCart(c);
};
export const removeFromCart = (i: number) => { const c = getCart(); c.splice(i, 1); setCart(c); };
export const updateCartQty = (i: number, qty: number) => {
  const c = getCart(); if (c[i]) c[i].qty = Math.max(1, qty); setCart(c);
};
export const clearCart = () => setCart([]);

// --- Auth ---
type StoredUser = User & { password: string };
export const getCurrentUser = (): User | null => read(KEYS.user, null);
export const signUp = (email: string, password: string, name: string): User | { error: string } => {
  const users = read<StoredUser[]>(KEYS.users, []);
  if (users.some((u) => u.email === email)) return { error: "Email already used" };
  const u: StoredUser = { id: crypto.randomUUID(), email, password, name, isAdmin: false };
  users.push(u);
  write(KEYS.users, users);
  const { password: _, ...pub } = u;
  write(KEYS.user, pub);
  return pub;
};
export const signIn = (email: string, password: string): User | { error: string } => {
  const users = read<StoredUser[]>(KEYS.users, []);
  const u = users.find((x) => x.email === email && x.password === password);
  if (!u) return { error: "Invalid credentials" };
  const { password: _, ...pub } = u;
  write(KEYS.user, pub);
  return pub;
};
export const signOut = () => write(KEYS.user, null);

// --- Orders ---
export const getOrders = (userId?: string): Order[] => {
  const all = read<Order[]>(KEYS.orders, []);
  return userId ? all.filter((o) => o.userId === userId) : all;
};
export const placeOrder = (o: Omit<Order, "id" | "createdAt" | "status" | "tracking" | "trackingNumber" | "carrier">): Order => {
  const now = Date.now();
  const trackingNumber = "GZ" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const order: Order = {
    ...o,
    id: crypto.randomUUID(),
    createdAt: now,
    status: "pending",
    trackingNumber,
    carrier: "GenZ Express",
    tracking: [{ status: "pending", at: now, note: "Order received" }],
  };
  const all = read<Order[]>(KEYS.orders, []);
  all.unshift(order);
  write(KEYS.orders, all);
  // Decrement stock + audit
  const products = getProducts();
  o.items.forEach((it) => {
    const p = products.find((x) => x.id === it.productId);
    if (!p) return;
    const before = p.stock;
    p.stock = Math.max(0, p.stock - it.qty);
    appendStockAudit({
      id: crypto.randomUUID(),
      productId: p.id,
      productName: p.name,
      before,
      after: p.stock,
      delta: p.stock - before,
      source: "order",
      note: `Order #${order.id.slice(0, 8)}`,
      at: now,
    });
  });
  write(KEYS.products, products);
  trackFunnel("order_completed");
  return order;
};

export const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string): Order | null => {
  const all = read<Order[]>(KEYS.orders, []);
  const o = all.find((x) => x.id === orderId);
  if (!o) return null;
  const wasCancelled = o.status === "cancelled";
  o.status = status;
  o.tracking = [...(o.tracking ?? []), { status, at: Date.now(), note }];
  write(KEYS.orders, all);
  // If transitioning into cancelled, restock items
  if (status === "cancelled" && !wasCancelled) {
    const products = getProducts();
    o.items.forEach((it) => {
      const p = products.find((x) => x.id === it.productId);
      if (!p) return;
      const before = p.stock;
      p.stock = before + it.qty;
      appendStockAudit({
        id: crypto.randomUUID(),
        productId: p.id,
        productName: p.name,
        before,
        after: p.stock,
        delta: it.qty,
        source: "cancellation",
        note: `Order #${o.id.slice(0, 8)} cancelled`,
        at: Date.now(),
      });
    });
    write(KEYS.products, products);
  }
  return o;
};

export const updateOrderShipping = (
  orderId: string,
  shipping: Order["shipping"],
  trackingNumber?: string,
  carrier?: string,
): Order | null => {
  const all = read<Order[]>(KEYS.orders, []);
  const o = all.find((x) => x.id === orderId);
  if (!o) return null;
  o.shipping = shipping;
  if (trackingNumber !== undefined) o.trackingNumber = trackingNumber;
  if (carrier !== undefined) o.carrier = carrier;
  o.tracking = [...(o.tracking ?? []), { status: o.status, at: Date.now(), note: "Shipping/tracking updated" }];
  write(KEYS.orders, all);
  return o;
};

export const cancelOrder = (orderId: string, note?: string): Order | null =>
  updateOrderStatus(orderId, "cancelled", note ?? "Order cancelled");

export const getOrder = (id: string): Order | undefined =>
  read<Order[]>(KEYS.orders, []).find((o) => o.id === id);

// --- Funnel analytics ---
export const getFunnelEvents = (): FunnelEvent[] => read(KEYS.funnel, []);
export const trackFunnel = (type: FunnelEventType) => {
  const list = getFunnelEvents();
  list.push({ type, at: Date.now() });
  // cap at 5000 to avoid bloat
  if (list.length > 5000) list.splice(0, list.length - 5000);
  write(KEYS.funnel, list);
};

// --- Stock audit ---
export const getStockAudit = (): StockAuditEntry[] => read(KEYS.stockAudit, []);
export const appendStockAudit = (entry: StockAuditEntry) => {
  const list = getStockAudit();
  list.unshift(entry);
  if (list.length > 2000) list.length = 2000;
  write(KEYS.stockAudit, list);
};

// --- Reviews ---
export const getReviews = (): Review[] => read(KEYS.reviews, []);
export const getProductReviews = (productId: string) => getReviews().filter((r) => r.productId === productId);
export const addReview = (r: Omit<Review, "id" | "at">): Review => {
  const review: Review = { ...r, id: crypto.randomUUID(), at: Date.now() };
  const list = getReviews();
  list.unshift(review);
  write(KEYS.reviews, list);
  return review;
};
export const deleteReview = (id: string) => write(KEYS.reviews, getReviews().filter((r) => r.id !== id));
export const productRating = (productId: string): { avg: number; count: number } => {
  const rs = getProductReviews(productId);
  if (rs.length === 0) return { avg: 0, count: 0 };
  return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length };
};

// --- Wishlist (per current user, fallback to "guest") ---
type WishMap = Record<string, string[]>;
const wishKey = () => getCurrentUser()?.id ?? "guest";
export const getWishlist = (): string[] => {
  const all = read<WishMap>(KEYS.wishlist, {});
  return all[wishKey()] ?? [];
};
export const toggleWishlist = (productId: string): boolean => {
  const all = read<WishMap>(KEYS.wishlist, {});
  const k = wishKey();
  const cur = new Set(all[k] ?? []);
  const added = !cur.has(productId);
  if (added) cur.add(productId); else cur.delete(productId);
  all[k] = [...cur];
  write(KEYS.wishlist, all);
  return added;
};
export const isWishlisted = (productId: string) => getWishlist().includes(productId);

// --- Recently viewed ---
export const getRecent = (): string[] => read(KEYS.recent, []);
export const trackRecent = (productId: string) => {
  const cur = getRecent().filter((id) => id !== productId);
  cur.unshift(productId);
  if (cur.length > 12) cur.length = 12;
  write(KEYS.recent, cur);
};

// --- Coupons ---
export const getCoupons = (): Coupon[] => read(KEYS.coupons, []);
export const saveCoupon = (c: Coupon) => {
  const list = getCoupons();
  const i = list.findIndex((x) => x.id === c.id);
  if (i >= 0) list[i] = c; else list.push(c);
  write(KEYS.coupons, list);
};
export const deleteCoupon = (id: string) => write(KEYS.coupons, getCoupons().filter((c) => c.id !== id));
export const findCoupon = (code: string): Coupon | undefined =>
  getCoupons().find((c) => c.code.toUpperCase() === code.trim().toUpperCase());

export type CouponValidation =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: string };

export const validateCoupon = (code: string, subtotal: number): CouponValidation => {
  const c = findCoupon(code);
  if (!c) return { ok: false, reason: "Code not found" };
  if (!c.active) return { ok: false, reason: "Code is inactive" };
  if (c.expiresAt && c.expiresAt < Date.now()) return { ok: false, reason: "Code has expired" };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, reason: "Code usage limit reached" };
  if (c.minSubtotal && subtotal < c.minSubtotal) return { ok: false, reason: `Min subtotal $${c.minSubtotal}` };
  const discount = c.type === "percent"
    ? Math.min(subtotal, (subtotal * c.value) / 100)
    : Math.min(subtotal, c.value);
  return { ok: true, coupon: c, discount };
};

export const consumeCoupon = (id: string) => {
  const list = getCoupons();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  c.uses = (c.uses ?? 0) + 1;
  write(KEYS.coupons, list);
};

// --- React hooks ---
function useStore<T>(getter: () => T): T {
  return useSyncExternalStore(subscribe, getter, getter);
}
export const useProducts = () => useStore(getProducts);
export const useCart = () => useStore(getCart);
export const useUser = () => useStore(getCurrentUser);
export const useCategories = () => useStore(getCategories);
export const useFunnelEvents = () => useStore(getFunnelEvents);
export const useStockAudit = () => useStore(getStockAudit);
// Derived hooks: subscribe to the full underlying list, then derive with useMemo
// to keep the returned reference stable across renders.
export const useOrders = (userId?: string) => {
  const all = useStore(() => read<Order[]>(KEYS.orders, []));
  return useMemo(() => (userId ? all.filter((o) => o.userId === userId) : all), [all, userId]);
};
export const useOrder = (id: string) => {
  const all = useStore(() => read<Order[]>(KEYS.orders, []));
  return useMemo(() => all.find((o) => o.id === id), [all, id]);
};

export const useReviews = () => useStore(getReviews);
export const useProductReviews = (productId: string) => {
  const all = useStore(getReviews);
  return useMemo(() => all.filter((r) => r.productId === productId), [all, productId]);
};
export const useProductRating = (productId: string) => {
  const all = useStore(getReviews);
  return useMemo(() => {
    const rs = all.filter((r) => r.productId === productId);
    return rs.length === 0
      ? { avg: 0, count: 0 }
      : { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length };
  }, [all, productId]);
};
export const useWishlist = () => {
  const all = useStore(() => read<Record<string, string[]>>(KEYS.wishlist, {}));
  const user = useUser();
  return useMemo(() => all[user?.id ?? "guest"] ?? [], [all, user]);
};
export const useRecent = () => useStore(() => read<string[]>(KEYS.recent, []));
export const useCoupons = () => useStore(getCoupons);

export const cartTotal = (cart: CartItem[], products: Product[]) =>
  cart.reduce((sum, i) => sum + (products.find((p) => p.id === i.productId)?.price ?? 0) * i.qty, 0);

export const cartCount = (cart: CartItem[]) => cart.reduce((n, i) => n + i.qty, 0);

// Hydration helper for client-only effects
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export const useEnsureSeeded = () => {
  useEffect(() => { ensureSeeded(); }, []);
};

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// Re-export for type-only clarity
export const _noop = () => useCallback(() => {}, []);
