import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, useWishlist } from "@/lib/store";
import { useMemo } from "react";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — GenZ" },
      { name: "description", content: "Your saved products on GenZ Streetwear." },
    ],
  }),
  component: Wishlist,
});

function Wishlist() {
  const wish = useWishlist();
  const products = useProducts();
  const items = useMemo(
    () => wish.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p),
    [wish, products],
  );

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <h1 className="text-5xl flex items-center gap-3">
              <Heart className="fill-pop-pink text-pop-pink" size={40}/> Wishlist
            </h1>
            <p className="text-muted-foreground mt-1">{items.length} saved item{items.length === 1 ? "" : "s"}</p>
          </div>
          <Link to="/shop" className="btn-pop ghost">Keep shopping</Link>
        </div>

        {items.length === 0 ? (
          <div className="sticker rounded-2xl bg-white p-12 text-center">
            <div className="text-6xl mb-3">💖</div>
            <p className="font-bold mb-4">No favorites yet — tap the heart on any product.</p>
            <Link to="/shop" className="btn-pop">Discover drops</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((p, i) => <ProductCard key={p.id} product={p} index={i}/>)}
          </div>
        )}
      </section>
    </Layout>
  );
}
