import { createServerFn } from "@tanstack/react-start";
import type { Product } from "./types";

export interface RecommendationSignals {
  products: Product[];
  purchasedIds: string[];
  recentIds: string[];
  wishlistIds: string[];
  // productId -> qty purchased (used to weight category interest)
  purchaseQty?: Record<string, number>;
  limit?: number;
}

export interface RecommendationResult {
  items: Product[];
  reason: string;
  cached: boolean;
  computedAt: number;
}

// In-memory LRU cache on the server. Keyed by a stable hash of the inputs.
// Cache lives for the lifetime of the worker instance; each entry has a TTL.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; value: Omit<RecommendationResult, "cached"> }>();

function hashKey(input: RecommendationSignals): string {
  const parts = [
    input.products.map((p) => `${p.id}:${p.category}:${p.stock}`).sort().join("|"),
    [...input.purchasedIds].sort().join(","),
    [...input.recentIds].join(","),
    [...input.wishlistIds].sort().join(","),
    Object.entries(input.purchaseQty ?? {}).sort().map(([k, v]) => `${k}=${v}`).join(","),
    String(input.limit ?? 4),
  ];
  // simple djb2
  let h = 5381;
  const s = parts.join("§");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `r_${h}`;
}

function compute(input: RecommendationSignals): Omit<RecommendationResult, "cached"> {
  const { products, purchasedIds, recentIds, wishlistIds, purchaseQty = {}, limit = 4 } = input;
  const catScore = new Map<string, number>();
  const bump = (cat: string, w: number) => catScore.set(cat, (catScore.get(cat) ?? 0) + w);

  const productById = new Map(products.map((p) => [p.id, p]));

  for (const id of purchasedIds) {
    const p = productById.get(id);
    if (p) bump(p.category, 3 * (purchaseQty[id] ?? 1));
  }
  for (const id of recentIds) {
    const p = productById.get(id);
    if (p) bump(p.category, 2);
  }
  for (const id of wishlistIds) {
    const p = productById.get(id);
    if (p) bump(p.category, 1);
  }

  const exclude = new Set<string>([...purchasedIds, ...wishlistIds, ...recentIds]);
  const hasHistory = catScore.size > 0;

  const scored = products
    .filter((p) => p.stock > 0 && !exclude.has(p.id))
    .map((p) => ({ p, s: catScore.get(p.category) ?? 0 }))
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name));

  const picks = scored.slice(0, limit).map((x) => x.p);
  const items =
    picks.length > 0 ? picks : products.filter((p) => p.stock > 0).slice(0, limit);

  const topCat = [...catScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const reason = hasHistory
    ? topCat
      ? `Because you love ${topCat}`
      : "Picked for you"
    : "Trending right now";

  return { items, reason, computedAt: Date.now() };
}

export const getRecommendations = createServerFn({ method: "POST" })
  .inputValidator((data: RecommendationSignals) => {
    if (!data || !Array.isArray(data.products)) {
      throw new Error("products array required");
    }
    return {
      products: data.products.slice(0, 500),
      purchasedIds: (data.purchasedIds ?? []).slice(0, 500),
      recentIds: (data.recentIds ?? []).slice(0, 50),
      wishlistIds: (data.wishlistIds ?? []).slice(0, 500),
      purchaseQty: data.purchaseQty ?? {},
      limit: Math.min(Math.max(data.limit ?? 4, 1), 20),
    } satisfies RecommendationSignals;
  })
  .handler(async ({ data }): Promise<RecommendationResult> => {
    const key = hashKey(data);
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) {
      // LRU touch
      cache.delete(key);
      cache.set(key, hit);
      return { ...hit.value, cached: true };
    }
    const value = compute(data);
    cache.set(key, { at: now, value });
    if (cache.size > CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    return { ...value, cached: false };
  });
