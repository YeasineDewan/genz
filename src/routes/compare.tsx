import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { X, ShoppingBag, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { Layout, openCartDrawer } from "@/components/Layout";
import { Stars } from "@/components/Stars";
import { WishlistButton } from "@/components/WishlistButton";
import {
  addToCart, clearCompare, colorHasStock, formatPrice, removeCompare,
  useCompare, useProducts, useReviews,
} from "@/lib/store";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare products — GenZ Streetwear" },
      { name: "description", content: "Put your shortlist side by side — price, rating, sizes, colors and stock, all in one view." },
      { property: "og:title", content: "Compare products — GenZ Streetwear" },
      { property: "og:description", content: "Compare price, rating, sizes, colors and availability across your saved picks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const ids = useCompare();
  const products = useProducts();
  const reviews = useReviews();
  const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];

  const rating = (id: string) => {
    const rs = reviews.filter((r) => r.productId === id && (r.status ?? "approved") === "approved");
    return rs.length ? { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length } : { avg: 0, count: 0 };
  };

  const add = (p: Product) => {
    const color = p.colors.find((c) => colorHasStock(p, c)) ?? p.colors[0];
    const size = p.sizes[0];
    addToCart({ productId: p.id, size, color, qty: 1 });
    toast.success(`${p.name} added`, { description: `${size} · ${color}` });
    openCartDrawer();
  };

  const rows: { label: string; render: (p: Product) => React.ReactNode }[] = [
    { label: "Price", render: (p) => <span className="font-display text-2xl">{formatPrice(p.price)}</span> },
    { label: "Rating", render: (p) => <Stars value={rating(p.id).avg} size={12} count={rating(p.id).count}/> },
    { label: "Category", render: (p) => <span className="chip text-xs">{p.category}</span> },
    { label: "Sizes", render: (p) => <span className="text-sm">{p.sizes.join(", ")}</span> },
    { label: "Colors", render: (p) => <span className="text-sm capitalize">{p.colors.join(", ")}</span> },
    {
      label: "Availability",
      render: (p) => (
        <span className={`chip text-xs ${p.stock === 0 ? "bg-destructive text-white" : p.stock <= 5 ? "bg-pop-orange" : "bg-pop-cyan"}`}>
          {p.stock === 0 ? "Sold out" : p.stock <= 5 ? `Only ${p.stock} left` : "In stock"}
        </span>
      ),
    },
    { label: "Details", render: (p) => <p className="text-xs text-muted-foreground line-clamp-4">{p.description}</p> },
  ];

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-5xl flex items-center gap-3"><GitCompare size={28}/> Compare</h1>
            <p className="text-muted-foreground mt-1">{items.length} item{items.length === 1 ? "" : "s"} side by side.</p>
          </div>
          {items.length > 0 && <button onClick={clearCompare} className="chip">Clear all</button>}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-3">⚖️</div>
            <p className="font-bold text-lg">Nothing to compare yet.</p>
            <p className="text-muted-foreground text-sm mt-1">Hit the compare icon on any product card.</p>
            <Link to="/shop" className="btn-pop mt-6">Browse the shop</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[40rem]">
              <div className="grid gap-4" style={{ gridTemplateColumns: `10rem repeat(${items.length}, minmax(12rem, 1fr))` }}>
                <div/>
                {items.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }} className="relative sticker rounded-2xl bg-white overflow-hidden">
                    <button onClick={() => removeCompare(p.id)} aria-label={`Remove ${p.name}`}
                      className="absolute top-2 right-2 z-10 h-8 w-8 grid place-items-center rounded-full border-2 border-ink bg-white">
                      <X size={12}/>
                    </button>
                    <Link to="/product/$slug" params={{ slug: p.slug }} className="block">
                      <div className="aspect-square bg-pop-cyan">
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover mix-blend-multiply"/>
                      </div>
                      <div className="p-3 border-t-[3px] border-ink font-bold truncate">{p.name}</div>
                    </Link>
                  </motion.div>
                ))}

                {rows.map((row) => (
                  <div key={row.label} className="contents">
                    <div className="text-xs uppercase font-bold tracking-wide self-center text-muted-foreground">{row.label}</div>
                    {items.map((p) => (
                      <div key={p.id + row.label} className="sticker-sm rounded-xl bg-white p-3">{row.render(p)}</div>
                    ))}
                  </div>
                ))}

                <div/>
                {items.map((p) => (
                  <div key={p.id + "actions"} className="flex items-center gap-2">
                    <button onClick={() => add(p)} disabled={p.stock === 0} className="btn-pop flex-1 justify-center text-sm disabled:opacity-40">
                      <ShoppingBag size={16}/> {p.stock === 0 ? "Sold out" : "Add"}
                    </button>
                    <WishlistButton productId={p.id}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
