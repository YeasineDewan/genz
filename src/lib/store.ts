// Auth is now backed by Supabase Auth — sessions, passwords, and roles all
// live server-side. Per-user "extras" that aren't on the auth user yet
// (addresses, preferences, notifications, loyalty points, avatar, bio,
// birthday, phone) are kept in a localStorage cache keyed by Supabase
// `user.id`. Nothing sensitive is stored client-side.
import { useEffect, useState, useCallback, useMemo, useSyncExternalStore } from "react";
import { seedProducts } from "./seed";
import { recordAudit } from "./audit";
import { supabase } from "@/integrations/supabase/client";
import type {
  Product, CartItem, User, Order, CategoryDef, OrderStatus, TrackingEvent,
  FunnelEvent, FunnelEventType, StockAuditEntry, StockChangeSource,
  Review, ReviewStatus, ReportReason, Coupon, CouponRedemption,
  Address, UserPreferences, Notification,
} from "./types";


const KEYS = {
  products: "genz.products",
  cart: "genz.cart",
  user: "genz.user",                // cached User object for current session
  profiles: "genz.profileExtras",   // Record<userId, ProfileExtras>
  orders: "genz.orders",
  categories: "genz.categories",
  funnel: "genz.funnel",
  stockAudit: "genz.stockAudit",
  reviews: "genz.reviews",
  wishlist: "genz.wishlist",
  recent: "genz.recent",
  coupons: "genz.coupons",
  appliedCoupon: "genz.appliedCoupon",
} as const;

// Per-user extras not yet stored in Supabase. Keyed by Supabase user.id.
type ProfileExtras = Pick<
  User,
  "phone" | "avatar" | "bio" | "birthday" | "addresses" | "preferences" | "notifications" | "loyaltyPoints"
>;


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
    write(KEYS.users, []);
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

const startSession = (userId: string, remember: boolean) => {
  const expiresAt = Date.now() + (remember ? SESSION_MS_REMEMBER : SESSION_MS_DEFAULT);
  write<SessionRecord>(KEYS.session, { userId, expiresAt, remember });
};

const clearSession = () => {
  write(KEYS.session, null);
  write(KEYS.user, null);
};

export const getSession = (): SessionRecord | null => {
  const s = read<SessionRecord | null>(KEYS.session, null);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { clearSession(); return null; }
  return s;
};

export const getCurrentUser = (): User | null => {
  const u = read<User | null>(KEYS.user, null);
  if (!u) return null;
  const s = read<SessionRecord | null>(KEYS.session, null);
  // Back-compat: pre-existing users without a session get one started silently.
  if (!s) { startSession(u.id, false); return u; }
  if (Date.now() > s.expiresAt) { clearSession(); return null; }
  return u;
};

export const signUp = (
  email: string, password: string, name: string, remember = false,
): User | { error: string } => {
  const users = read<StoredUser[]>(KEYS.users, []);
  if (users.some((u) => u.email === email)) return { error: "Email already used" };
  const u: StoredUser = { id: crypto.randomUUID(), email, password, name, isAdmin: false };
  users.push(u);
  write(KEYS.users, users);
  const { password: _, ...pub } = u;
  write(KEYS.user, pub);
  startSession(pub.id, remember);
  return pub;
};
export const signIn = (
  email: string, password: string, remember = false,
): User | { error: string } => {
  const users = read<StoredUser[]>(KEYS.users, []);
  const u = users.find((x) => x.email === email && x.password === password);
  if (!u) {
    recordAudit({ action: "admin_login_failed", actorEmail: email, detail: "Invalid credentials" });
    return { error: "Invalid credentials" };
  }
  const { password: _, ...pub } = u;
  write(KEYS.user, pub);
  startSession(pub.id, remember);
  recordAudit({
    action: pub.isAdmin ? "admin_login" : "customer_login",
    actorEmail: pub.email, actorId: pub.id, isAdmin: pub.isAdmin,
    detail: remember ? "Remembered session (30d)" : "Standard session (1h)",
  });
  return pub;
};
export const signOut = () => {
  const cur = read<User | null>(KEYS.user, null);
  if (cur) {
    recordAudit({
      action: "sign_out", actorEmail: cur.email, actorId: cur.id, isAdmin: cur.isAdmin,
    });
  }
  clearSession();
};

// --- Password reset (token-based). Sends via configured provider when available;
// otherwise returns the URL so the caller can display a copy-link fallback. ---
export const requestPasswordReset = async (
  email: string,
  opts?: { isAdmin?: boolean; origin?: string },
): Promise<
  | { token: string; expiresAt: number; emailed: boolean; resetUrl: string }
  | { error: string }
> => {
  const users = read<StoredUser[]>(KEYS.users, []);
  const u = users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u) {
    recordAudit({ action: "password_reset_failed", actorEmail: email, detail: "Unknown account" });
    return { error: "No account with that email" };
  }
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const expiresAt = Date.now() + RESET_TOKEN_MS;
  const tokens = read<Record<string, ResetTokenRecord>>(KEYS.resetTokens, {});
  tokens[token] = { userId: u.id, expiresAt };
  write(KEYS.resetTokens, tokens);

  const origin = opts?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const isAdmin = !!opts?.isAdmin;
  const resetUrl = `${origin}/reset-password?token=${token}${isAdmin ? "&admin=true" : ""}`;

  let emailed = false;
  if (isEmailConfigured()) {
    const r = await sendEmail(buildResetEmail({ to: u.email, resetUrl, isAdmin }));
    emailed = r.ok;
    recordAudit({
      action: "password_reset_requested",
      actorEmail: u.email, actorId: u.id, isAdmin: u.isAdmin,
      detail: r.ok ? `Emailed via ${r.provider}` : `Email failed: ${r.error}`,
    });
  } else {
    recordAudit({
      action: "password_reset_requested",
      actorEmail: u.email, actorId: u.id, isAdmin: u.isAdmin,
      detail: "Email not configured — link shown in browser",
    });
  }
  return { token, expiresAt, emailed, resetUrl };
};

export const verifyResetToken = (token: string): { ok: true; email: string } | { error: string } => {
  const tokens = read<Record<string, ResetTokenRecord>>(KEYS.resetTokens, {});
  const t = tokens[token];
  if (!t) return { error: "Invalid or expired token" };
  if (Date.now() > t.expiresAt) return { error: "Token expired" };
  const users = read<StoredUser[]>(KEYS.users, []);
  const u = users.find((x) => x.id === t.userId);
  if (!u) return { error: "User not found" };
  return { ok: true, email: u.email };
};

export const resetPasswordWithToken = (token: string, newPw: string): { ok: true } | { error: string } => {
  if (newPw.length < 6) return { error: "Password must be at least 6 characters" };
  const tokens = read<Record<string, ResetTokenRecord>>(KEYS.resetTokens, {});
  const t = tokens[token];
  if (!t || Date.now() > t.expiresAt) {
    recordAudit({ action: "password_reset_failed", detail: "Invalid or expired token" });
    return { error: "Invalid or expired token" };
  }
  const users = read<StoredUser[]>(KEYS.users, []);
  const u = users.find((x) => x.id === t.userId);
  if (!u) return { error: "User not found" };
  u.password = newPw;
  write(KEYS.users, users);
  delete tokens[token];
  write(KEYS.resetTokens, tokens);
  recordAudit({
    action: "password_reset_used",
    actorEmail: u.email, actorId: u.id, isAdmin: u.isAdmin,
    detail: "Password updated via reset token",
  });
  return { ok: true };
};

// --- Profile / addresses / prefs / notifications / loyalty ---
const persistUser = (u: User) => {
  write(KEYS.user, u);
  const users = read<StoredUser[]>(KEYS.users, []);
  const i = users.findIndex((x) => x.id === u.id);
  if (i >= 0) {
    users[i] = { ...users[i], ...u };
    write(KEYS.users, users);
  }
};

export const updateProfile = (patch: Partial<User>): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  const updated: User = { ...cur, ...patch };
  persistUser(updated);
  return updated;
};

export const changePassword = (currentPw: string, newPw: string): { ok: true } | { error: string } => {
  const cur = getCurrentUser();
  if (!cur) return { error: "Not signed in" };
  if (newPw.length < 6) return { error: "New password must be at least 6 characters" };
  const users = read<StoredUser[]>(KEYS.users, []);
  const u = users.find((x) => x.id === cur.id);
  if (!u) return { error: "User not found" };
  if (u.password !== currentPw) return { error: "Current password is incorrect" };
  u.password = newPw;
  write(KEYS.users, users);
  return { ok: true };
};

export const getAddresses = (): Address[] => getCurrentUser()?.addresses ?? [];

export const saveAddress = (a: Address): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  const list = [...(cur.addresses ?? [])];
  const i = list.findIndex((x) => x.id === a.id);
  if (a.isDefault) list.forEach((x) => (x.isDefault = false));
  if (i >= 0) list[i] = a; else list.push(a);
  if (list.length === 1) list[0].isDefault = true;
  return updateProfile({ addresses: list });
};

export const deleteAddress = (id: string): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  const list = (cur.addresses ?? []).filter((a) => a.id !== id);
  if (list.length > 0 && !list.some((a) => a.isDefault)) list[0].isDefault = true;
  return updateProfile({ addresses: list });
};

export const setDefaultAddress = (id: string): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  const list = (cur.addresses ?? []).map((a) => ({ ...a, isDefault: a.id === id }));
  return updateProfile({ addresses: list });
};

export const getDefaultAddress = (): Address | undefined =>
  getAddresses().find((a) => a.isDefault) ?? getAddresses()[0];

const DEFAULT_PREFS: UserPreferences = {
  newsletter: true,
  orderUpdates: true,
  promos: false,
  smsAlerts: false,
  currency: "USD",
  language: "en",
  theme: "system",
};
export const getPreferences = (): UserPreferences => ({
  ...DEFAULT_PREFS,
  ...(getCurrentUser()?.preferences ?? {}),
});
export const updatePreferences = (patch: Partial<UserPreferences>): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  return updateProfile({ preferences: { ...DEFAULT_PREFS, ...(cur.preferences ?? {}), ...patch } });
};

export const getNotifications = (): Notification[] => getCurrentUser()?.notifications ?? [];
export const pushNotification = (n: Omit<Notification, "id" | "at"> & { at?: number }): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  const list = [
    { id: crypto.randomUUID(), at: n.at ?? Date.now(), read: false, ...n },
    ...(cur.notifications ?? []),
  ].slice(0, 100);
  return updateProfile({ notifications: list });
};
export const markNotificationRead = (id: string, read = true): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  const list = (cur.notifications ?? []).map((n) => (n.id === id ? { ...n, read } : n));
  return updateProfile({ notifications: list });
};
export const markAllNotificationsRead = (): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  return updateProfile({ notifications: (cur.notifications ?? []).map((n) => ({ ...n, read: true })) });
};
export const clearNotifications = (): User | null => updateProfile({ notifications: [] });

export const addLoyaltyPoints = (delta: number): User | null => {
  const cur = getCurrentUser();
  if (!cur) return null;
  return updateProfile({ loyaltyPoints: Math.max(0, (cur.loyaltyPoints ?? 0) + delta) });
};

// Loyalty tier rules
export type LoyaltyTier = { name: string; min: number; perks: string[]; color: string };
export const LOYALTY_TIERS: LoyaltyTier[] = [
  { name: "Starter", min: 0, perks: ["Free shipping over $80"], color: "bg-pop-cyan" },
  { name: "Hype", min: 200, perks: ["Early drops access", "Birthday gift"], color: "bg-pop-yellow" },
  { name: "Icon", min: 750, perks: ["10% off everything", "Priority support"], color: "bg-pop-orange" },
  { name: "Legend", min: 2000, perks: ["Free express shipping", "Exclusive merch"], color: "bg-pop-pink" },
];
export const getLoyaltyTier = (points: number): { tier: LoyaltyTier; next?: LoyaltyTier; progress: number } => {
  const sorted = [...LOYALTY_TIERS].sort((a, b) => a.min - b.min);
  let tier = sorted[0];
  let next: LoyaltyTier | undefined;
  for (let i = 0; i < sorted.length; i++) {
    if (points >= sorted[i].min) {
      tier = sorted[i];
      next = sorted[i + 1];
    }
  }
  const progress = next ? Math.min(100, Math.round(((points - tier.min) / (next.min - tier.min)) * 100)) : 100;
  return { tier, next, progress };
};


// --- Orders ---
export const getOrders = (userId?: string): Order[] => {
  const all = read<Order[]>(KEYS.orders, []);
  return userId ? all.filter((o) => o.userId === userId) : all;
};
export const placeOrder = (
  o: Omit<Order, "id" | "createdAt" | "status" | "tracking" | "trackingNumber" | "carrier">
): Order => {
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
  // Decrement stock + audit (variant-aware)
  const products = getProducts();
  o.items.forEach((it) => {
    const p = products.find((x) => x.id === it.productId);
    if (!p) return;
    const before = p.stock;
    p.stock = Math.max(0, p.stock - it.qty);
    if (p.variants && p.variants.length > 0) {
      const v = p.variants.find((x) => x.size === it.size && x.color === it.color);
      if (v) v.stock = Math.max(0, v.stock - it.qty);
    }
    appendStockAudit({
      id: crypto.randomUUID(),
      productId: p.id,
      productName: p.name,
      before,
      after: p.stock,
      delta: p.stock - before,
      source: "order",
      note: `Order #${order.id.slice(0, 8)} (${it.size}/${it.color})`,
      at: now,
    });
  });
  write(KEYS.products, products);
  if (o.couponCode) {
    const c = findCoupon(o.couponCode);
    if (c) {
      consumeCoupon(c.id, {
        at: now,
        orderId: order.id,
        userId: o.userId,
        discount: o.discount ?? 0,
        subtotal: o.subtotal ?? o.total,
      });
    }
  }
  trackFunnel("order_completed");
  // Reward loyalty + notify (1 pt per $1)
  const earned = Math.max(0, Math.round(order.total));
  if (earned > 0) addLoyaltyPoints(earned);
  pushNotification({
    title: `Order #${order.id.slice(0, 8)} placed`,
    body: `Total ${formatPrice(order.total)} · earned ${earned} pts`,
    href: `/order/${order.id}`,
    kind: "order",
  });
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
  // If transitioning into cancelled, restock items (variant-aware)
  if (status === "cancelled" && !wasCancelled) {
    const products = getProducts();
    o.items.forEach((it) => {
      const p = products.find((x) => x.id === it.productId);
      if (!p) return;
      const before = p.stock;
      p.stock = before + it.qty;
      if (p.variants && p.variants.length > 0) {
        const v = p.variants.find((x) => x.size === it.size && x.color === it.color);
        if (v) v.stock = v.stock + it.qty;
      }
      appendStockAudit({
        id: crypto.randomUUID(),
        productId: p.id,
        productName: p.name,
        before,
        after: p.stock,
        delta: it.qty,
        source: "cancellation",
        note: `Order #${o.id.slice(0, 8)} cancelled (${it.size}/${it.color})`,
        at: Date.now(),
      });
    });
    write(KEYS.products, products);
  }
  const cur = getCurrentUser();
  if (cur && cur.id === o.userId) {
    pushNotification({
      title: `Order #${o.id.slice(0, 8)} ${status.replace(/_/g, " ")}`,
      body: note,
      href: `/order/${o.id}`,
      kind: "order",
    });
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
const isVisible = (r: Review) => (r.status ?? "approved") === "approved";
export const getReviews = (): Review[] => read(KEYS.reviews, []);
export const getProductReviews = (productId: string) =>
  getReviews().filter((r) => r.productId === productId && isVisible(r));
export const addReview = (r: Omit<Review, "id" | "at">): Review => {
  const review: Review = { status: "approved", reports: 0, ...r, id: crypto.randomUUID(), at: Date.now() };
  const list = getReviews();
  list.unshift(review);
  write(KEYS.reviews, list);
  return review;
};
export const deleteReview = (id: string) => write(KEYS.reviews, getReviews().filter((r) => r.id !== id));
export const setReviewStatus = (id: string, status: ReviewStatus) => {
  const list = getReviews();
  const r = list.find((x) => x.id === id);
  if (!r) return;
  r.status = status;
  write(KEYS.reviews, list);
};
export const reportReview = (
  id: string,
  reason: ReportReason = "other",
  note?: string,
  userId?: string,
) => {
  const list = getReviews();
  const r = list.find((x) => x.id === id);
  if (!r) return;
  r.reports = (r.reports ?? 0) + 1;
  r.reportLog = [...(r.reportLog ?? []), { reason, note: note?.trim() || undefined, at: Date.now(), userId }];
  // auto-flag for moderation after 3 reports
  if ((r.reports ?? 0) >= 3 && (r.status ?? "approved") === "approved") r.status = "pending";
  write(KEYS.reviews, list);
};
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

export const validateCoupon = (code: string, subtotal: number, ctx?: { userId?: string }): CouponValidation => {
  const c = findCoupon(code);
  if (!c) return { ok: false, reason: "Code not found" };
  if (!c.active) return { ok: false, reason: "Code is inactive" };
  const now = Date.now();
  if (c.startsAt && c.startsAt > now) return { ok: false, reason: `Active from ${new Date(c.startsAt).toLocaleDateString()}` };
  if (c.expiresAt && c.expiresAt < now) return { ok: false, reason: "Code has expired" };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, reason: "Code usage limit reached" };
  if (c.minSubtotal && subtotal < c.minSubtotal) {
    return { ok: false, reason: `Min subtotal $${c.minSubtotal.toFixed(2)} required` };
  }
  if (c.maxPerUser && ctx?.userId) {
    const used = (c.redemptions ?? []).filter((r) => r.userId === ctx.userId).length;
    if (used >= c.maxPerUser) return { ok: false, reason: `Limit ${c.maxPerUser} per customer reached` };
  }
  if (c.firstOrderOnly && ctx?.userId) {
    const prior = read<Order[]>(KEYS.orders, []).some((o) => o.userId === ctx.userId && o.status !== "cancelled");
    if (prior) return { ok: false, reason: "First-order only" };
  }
  if (!(c.value > 0)) return { ok: false, reason: "Invalid discount value" };
  if (c.type === "percent" && c.value > 100) return { ok: false, reason: "Invalid percent value" };
  const discount = c.type === "percent"
    ? Math.min(subtotal, (subtotal * c.value) / 100)
    : Math.min(subtotal, c.value);
  return { ok: true, coupon: c, discount: Math.round(discount * 100) / 100 };
};

export const consumeCoupon = (id: string, redemption?: CouponRedemption) => {
  const list = getCoupons();
  const c = list.find((x) => x.id === id);
  if (!c) return;
  c.uses = (c.uses ?? 0) + 1;
  if (redemption) {
    c.redemptions = [...(c.redemptions ?? []), redemption];
  }
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

export const useReviews = () => useStore(getReviews); // all (for admin moderation)
export const useProductReviews = (productId: string) => {
  const all = useStore(getReviews);
  return useMemo(
    () => all.filter((r) => r.productId === productId && (r.status ?? "approved") === "approved"),
    [all, productId],
  );
};
export const useProductRating = (productId: string) => {
  const all = useStore(getReviews);
  return useMemo(() => {
    const rs = all.filter((r) => r.productId === productId && (r.status ?? "approved") === "approved");
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
export const useNotifications = () => {
  const u = useUser();
  return useMemo(() => u?.notifications ?? [], [u]);
};
export const useUnreadNotificationCount = () => {
  const list = useNotifications();
  return useMemo(() => list.filter((n) => !n.read).length, [list]);
};
export const useAddresses = () => {
  const u = useUser();
  return useMemo(() => u?.addresses ?? [], [u]);
};
export const usePreferences = () => {
  const u = useUser();
  return useMemo(() => ({ ...DEFAULT_PREFS, ...(u?.preferences ?? {}) }), [u]);
};
export const useLoyalty = () => {
  const u = useUser();
  return useMemo(() => {
    const points = u?.loyaltyPoints ?? 0;
    return { points, ...getLoyaltyTier(points) };
  }, [u]);
};

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

// --- Variant stock helpers ---
export const getVariantStock = (p: Product, size: string, color: string): number => {
  if (!p.variants || p.variants.length === 0) return p.stock;
  const v = p.variants.find((x) => x.size === size && x.color === color);
  return v ? v.stock : 0;
};
export const isVariantAvailable = (p: Product, size: string, color: string) =>
  getVariantStock(p, size, color) > 0;
export const sizeHasStock = (p: Product, size: string): boolean => {
  if (!p.variants || p.variants.length === 0) return p.stock > 0;
  return p.variants.some((v) => v.size === size && v.stock > 0);
};
export const colorHasStock = (p: Product, color: string): boolean => {
  if (!p.variants || p.variants.length === 0) return p.stock > 0;
  return p.variants.some((v) => v.color === color && v.stock > 0);
};

// --- Applied coupon (persists across cart/checkout) ---
export const getAppliedCoupon = (): string | null => read(KEYS.appliedCoupon, null);
export const setAppliedCoupon = (code: string | null) => write(KEYS.appliedCoupon, code);
export const useAppliedCoupon = () => useStore(getAppliedCoupon);

// Re-export for type-only clarity
export const _noop = () => useCallback(() => {}, []);
