import { Link } from "@tanstack/react-router";
import { useProducts, useRecent } from "@/lib/store";
import { ProductCard } from "./ProductCard";
import { useMemo } from "react";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const recent = useRecent();
  const products = useProducts();

  const items = useMemo(
    () => recent
      .filter((id) => id !== excludeId)
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .slice(0, 4),
    [recent, products, excludeId],
  );

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-3xl">Recently viewed</h2>
        <Link to="/shop" className="chip">Browse more</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((p, i) => <ProductCard key={p.id} product={p} index={i}/>)}
      </div>
    </section>
  );
}
