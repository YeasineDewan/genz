// Tiny localStorage-backed store. Swap to a Laravel REST client later by replacing
// the read/write helpers with fetch() calls — public API is stable.
import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { seedProducts } from "./seed";
import type { Product, CartItem, User, Order, CategoryDef, OrderStatus, TrackingEvent } from "./types";

const KEYS = {
  products: "genz.products",
  cart: "genz.cart",
  user: "genz.user",
  users: "genz.users",
  orders: "genz.orders",
  categories: "genz.categories",
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

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
  emit();
}

export function ensureSeeded() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(KEYS.products)) write(KEYS.products, seedProducts);
  if (!localStorage.getItem(KEYS.categories)) write(KEYS.categories, defaultCategories);
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
export const saveProduct = (p: Product) => {
  const list = getProducts();
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p; else list.push(p);
  write(KEYS.products, list);
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
  // Decrement stock
  const products = getProducts();
  o.items.forEach((it) => {
    const p = products.find((x) => x.id === it.productId);
    if (p) p.stock = Math.max(0, p.stock - it.qty);
  });
  write(KEYS.products, products);
  return order;
};

export const updateOrderStatus = (orderId: string, status: OrderStatus, note?: string): Order | null => {
  const all = read<Order[]>(KEYS.orders, []);
  const o = all.find((x) => x.id === orderId);
  if (!o) return null;
  o.status = status;
  o.tracking = [...(o.tracking ?? []), { status, at: Date.now(), note }];
  write(KEYS.orders, all);
  return o;
};

export const getOrder = (id: string): Order | undefined =>
  read<Order[]>(KEYS.orders, []).find((o) => o.id === id);

// --- React hooks ---
function useStore<T>(getter: () => T): T {
  return useSyncExternalStore(subscribe, getter, getter);
}
export const useProducts = () => useStore(getProducts);
export const useCart = () => useStore(getCart);
export const useUser = () => useStore(getCurrentUser);
export const useOrders = (userId?: string) => useStore(() => getOrders(userId));
export const useCategories = () => useStore(getCategories);
export const useOrder = (id: string) => useStore(() => getOrder(id));

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
