import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { QuickViewModal } from "@/components/QuickViewModal";
import { useProducts, useReviews, sizeHasStock } from "@/lib/store";
import type { Category, Product } from "@/lib/types";
import { useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";

type ShopSearch = {
  category?: Category | "all";
  q?: string;
  sort?: "new" | "price-asc" | "price-desc" | "rating";
  min?: number;
  max?: number;
  size?: string;
  color?: string;
  stock?: "all" | "in";
};

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — GenZ Streetwear" },
      { name: "description", content: "Browse hoodies, tees, cargos, sneakers and accessories." },
      { property: "og:title", content: "Shop — GenZ Streetwear" },
      { property: "og:description", content: "Browse hoodies, tees, cargos, sneakers and accessories." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    category: (s.category as ShopSearch["category"]) ?? "all",
    q: (s.q as string) ?? "",
    sort: (s.sort as ShopSearch["sort"]) ?? "new",
    min: s.min != null ? Number(s.min) : undefined,
    max: s.max != null ? Number(s.max) : undefined,
    size: (s.size as string) || undefined,
    color: (s.color as string) || undefined,
    stock: (s.stock as ShopSearch["stock"]) ?? "all",
  }),
  component: Shop,
});

function Shop() {
  const search = useSearch({ from: "/shop" });
  const navigate = useNavigate({ from: "/shop" });
  const products = useProducts();
  const reviews = useReviews();
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const allSizes = useMemo(
    () => [...new Set(products.flatMap((p) => p.sizes))],
    [products],
  );
  const allColors = useMemo(
    () => [...new Set(products.flatMap((p) => p.colors))],
    [products],
  );
  const priceBounds = useMemo(() => {
    const prices = products.map((p) => p.price);
    return { min: Math.floor(Math.min(...prices, 0)), max: Math.ceil(Math.max(...prices, 100)) };
  }, [products]);

  const ratingOf = (id: string) => {
    const rs = reviews.filter((r) => r.productId === id && (r.status ?? "approved") === "approved");
    return rs.length ? rs.reduce((s, r) => s + r.rating, 0) / rs.length : 0;
  };

  const filtered = useMemo(() => {
    let r = products;
    if (search.category && search.category !== "all") r = r.filter((p) => p.category === search.category);
    if (search.q) {
      const q = search.q.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (typeof search.min === "number" && !Number.isNaN(search.min)) r = r.filter((p) => p.price >= search.min!);
    if (typeof search.max === "number" && !Number.isNaN(search.max)) r = r.filter((p) => p.price <= search.max!);
    if (search.size) r = r.filter((p) => p.sizes.includes(search.size!) && sizeHasStock(p, search.size!));
    if (search.color) r = r.filter((p) => p.colors.includes(search.color!));
    if (search.stock === "in") r = r.filter((p) => p.stock > 0);
    if (search.sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (search.sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    if (search.sort === "rating") r = [...r].sort((a, b) => ratingOf(b.id) - ratingOf(a.id));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, search, reviews]);

  const activeFilters =
    (search.size ? 1 : 0) + (search.color ? 1 : 0) + (search.stock === "in" ? 1 : 0) +
    (search.min != null ? 1 : 0) + (search.max != null ? 1 : 0);

  const cats: { label: string; value: ShopSearch["category"] }[] = [
    { label: "All", value: "all" },
    { label: "Tops", value: "tops" },
    { label: "Bottoms", value: "bottoms" },
    { label: "Shoes", value: "shoes" },
    { label: "Accessories", value: "accessories" },
  ];

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-end justify-between flex-wrap gap-4 mb-8"
        >
          <div>
            <h1 className="text-5xl">The Shop</h1>
            <motion.p
              key={`${filtered.length}-${search.q ?? ""}`}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-muted-foreground mt-1"
            >
              {filtered.length} items{search.q ? ` matching "${search.q}"` : ""}
            </motion.p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`chip ${activeFilters > 0 ? "bg-pop-pink text-white" : ""}`}
            >
              <SlidersHorizontal size={14}/> Filters{activeFilters > 0 ? ` · ${activeFilters}` : ""}
            </button>
            <select aria-label="Sort products"
              value={search.sort}
              onChange={(e) => navigate({ search: (s: ShopSearch) => ({ ...s, sort: e.target.value as ShopSearch["sort"] }) })}
              className="sticker-sm rounded-full px-4 py-2 bg-white font-bold text-sm"
            >
              <option value="new">Newest</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="sticker rounded-2xl bg-white p-4 grid gap-5 md:grid-cols-4">
                <div>
                  <div className="text-xs uppercase font-bold mb-2">Price</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" inputMode="numeric" placeholder={`${priceBounds.min}`}
                      value={search.min ?? ""}
                      onChange={(e) => navigate({ search: (s: ShopSearch) => ({ ...s, min: e.target.value === "" ? undefined : Number(e.target.value) }) })}
                      className="w-20 rounded-full border-[3px] border-ink px-3 py-1 text-sm"
                      aria-label="Minimum price"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="number" inputMode="numeric" placeholder={`${priceBounds.max}`}
                      value={search.max ?? ""}
                      onChange={(e) => navigate({ search: (s: ShopSearch) => ({ ...s, max: e.target.value === "" ? undefined : Number(e.target.value) }) })}
                      className="w-20 rounded-full border-[3px] border-ink px-3 py-1 text-sm"
                      aria-label="Maximum price"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-bold mb-2">Size</div>
                  <div className="flex flex-wrap gap-1.5">
                    {allSizes.map((s) => (
                      <button key={s}
                        onClick={() => navigate({ search: (v: ShopSearch) => ({ ...v, size: v.size === s ? undefined : s }) })}
                        className={`chip text-xs ${search.size === s ? "bg-ink text-paper" : ""}`}>{s}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase font-bold mb-2">Color</div>
                  <div className="flex flex-wrap gap-1.5">
                    {allColors.map((c) => (
                      <button key={c}
                        onClick={() => navigate({ search: (v: ShopSearch) => ({ ...v, color: v.color === c ? undefined : c }) })}
                        className={`chip text-xs capitalize ${search.color === c ? "bg-ink text-paper" : ""}`}>{c}</button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-xs uppercase font-bold">Availability</div>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={search.stock === "in"}
                      onChange={(e) => navigate({ search: (v: ShopSearch) => ({ ...v, stock: e.target.checked ? "in" : "all" }) })}
                      className="h-4 w-4 accent-pop-pink"
                    />
                    In stock only
                  </label>
                  <button
                    onClick={() => navigate({ search: (v: ShopSearch) => ({ category: v.category, q: v.q, sort: v.sort, stock: "all" }) })}
                    className="chip text-xs w-fit mt-auto"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        <LayoutGroup>
          <motion.div layout className="flex flex-wrap gap-2 mb-8">
            {cats.map((c) => {
              const active = (search.category ?? "all") === c.value;
              return (
                <motion.button
                  key={c.value}
                  layout
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate({ search: (s: ShopSearch) => ({ ...s, category: c.value }) })}
                  className={`chip relative ${active ? "bg-pop-pink text-white" : ""}`}
                >
                  {active && (
                    <motion.span
                      layoutId="cat-pill"
                      className="absolute inset-0 rounded-full bg-pop-pink -z-10"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    />
                  )}
                  <span className="relative">{c.label}</span>
                </motion.button>
              );
            })}
            {search.q && (
              <motion.button
                layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                onClick={() => navigate({ search: (s: ShopSearch) => ({ ...s, q: "" }) })}
                className="chip bg-ink text-paper"
              >
                clear "{search.q}" ✕
              </motion.button>
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center py-24"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
                  className="text-6xl mb-3"
                >🫥</motion.div>
                <p className="font-bold text-lg">Nothing here. Try another vibe.</p>
              </motion.div>
            ) : (
              <motion.div
                key={`${search.category}-${search.sort}-${search.q}`}
                layout
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              >
                {filtered.map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.95 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 220, damping: 24 } },
                    }}
                  >
                    <ProductCard product={p} index={i} onQuickView={setQuickView}/>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </section>
      <QuickViewModal product={quickView} onClose={() => setQuickView(null)}/>
    </Layout>
  );
}
