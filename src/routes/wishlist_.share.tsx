import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, addToCart } from "@/lib/store";
import { useMemo } from "react";
import { Heart, ShoppingBag, Share2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  ids: z.string().optional(),
  by: z.string().optional(),
});

export const Route = createFileRoute("/wishlist_/share")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shared wishlist — GenZ" },
      { name: "description", content: "Someone shared their GenZ wishlist with you." },
    ],
  }),
  component: SharedWishlist,
});

function SharedWishlist() {
  const { ids, by } = Route.useSearch();
  const products = useProducts();
  const items = useMemo(() => {
    const list = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return list.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  }, [ids, products]);

  const addAll = () => {
    let n = 0;
    items.forEach((p) => {
      if (p.stock > 0) {
        addToCart({ productId: p.id, size: p.sizes[0], color: p.colors[0], qty: 1 });
        n++;
      }
    });
    toast.success(n > 0 ? `Added ${n} item${n === 1 ? "" : "s"} to your bag` : "All items sold out");
  };

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="sticker rounded-2xl bg-pop-pink text-white p-6 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <Share2 size={28}/>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase font-bold opacity-80">Shared wishlist</div>
              <h1 className="text-3xl md:text-4xl">{by ? `${by}'s picks` : "A wishlist for you"}</h1>
              <p className="text-sm mt-1 opacity-90">{items.length} item{items.length === 1 ? "" : "s"} curated for you.</p>
            </div>
            {items.length > 0 && (
              <button onClick={addAll} className="btn-pop bg-white text-ink">
                <ShoppingBag size={16}/> Add all to bag
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="sticker rounded-2xl bg-white p-12 text-center">
            <div className="text-6xl mb-3">🤷</div>
            <p className="font-bold mb-4">This shared wishlist is empty or expired.</p>
            <Link to="/shop" className="btn-pop">Discover the shop</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((p, i) => <ProductCard key={p.id} product={p} index={i}/>)}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/wishlist" className="btn-pop ghost"><Heart size={16}/> Build your own</Link>
        </div>
      </section>
    </Layout>
  );
}
