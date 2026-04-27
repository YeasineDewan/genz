import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/store";
import type { Category } from "@/lib/types";
import { useMemo } from "react";

type ShopSearch = { category?: Category | "all"; q?: string; sort?: "new" | "price-asc" | "price-desc" };

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
  }),
  component: Shop,
});

function Shop() {
  const search = useSearch({ from: "/shop" });
  const navigate = useNavigate({ from: "/shop" });
  const products = useProducts();

  const filtered = useMemo(() => {
    let r = products;
    if (search.category && search.category !== "all") r = r.filter((p) => p.category === search.category);
    if (search.q) {
      const q = search.q.toLowerCase();
      r = r.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (search.sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    if (search.sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [products, search]);

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
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-5xl">The Shop</h1>
            <p className="text-muted-foreground mt-1">{filtered.length} items{search.q ? ` matching "${search.q}"` : ""}</p>
          </div>
          <select
            value={search.sort}
            onChange={(e) => navigate({ search: (s: ShopSearch) => ({ ...s, sort: e.target.value as ShopSearch["sort"] }) })}
            className="sticker-sm rounded-full px-4 py-2 bg-white font-bold text-sm"
          >
            <option value="new">Newest</option>
            <option value="price-asc">Price: low → high</option>
            <option value="price-desc">Price: high → low</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {cats.map((c) => {
            const active = (search.category ?? "all") === c.value;
            return (
              <button
                key={c.value}
                onClick={() => navigate({ search: (s: ShopSearch) => ({ ...s, category: c.value }) })}
                className={`chip ${active ? "bg-pop-pink text-white" : ""}`}
              >
                {c.label}
              </button>
            );
          })}
          {search.q && (
            <button onClick={() => navigate({ search: (s: ShopSearch) => ({ ...s, q: "" }) })} className="chip bg-ink text-paper">
              clear "{search.q}" ✕
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-3">🫥</div>
            <p className="font-bold text-lg">Nothing here. Try another vibe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </section>
    </Layout>
  );
}
