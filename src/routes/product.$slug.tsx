import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductGallery } from "@/components/ProductGallery";
import { Reviews } from "@/components/Reviews";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { WishlistButton } from "@/components/WishlistButton";
import { Stars } from "@/components/Stars";
import { useProducts, addToCart, formatPrice, trackRecent, useProductRating, getVariantStock, sizeHasStock, colorHasStock } from "@/lib/store";
import { useEffect, useState } from "react";
import { ShoppingBag, Truck, RotateCcw, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — GenZ` },
      { name: "description", content: "Loud streetwear by GenZ." },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <Layout>
      <div className="max-w-xl mx-auto text-center py-24 px-4">
        <h1 className="text-5xl">Not found</h1>
        <p className="mt-3">This product wandered off.</p>
        <Link to="/shop" className="btn-pop mt-6">Back to shop</Link>
      </div>
    </Layout>
  ),
});

function ProductPage() {
  const { slug } = Route.useParams();
  const products = useProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) throw notFound();

  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]);
  const [qty, setQty] = useState(1);
  const rating = useProductRating(product.id);
  const variantStock = getVariantStock(product, size, color);
  const hasVariants = !!(product.variants && product.variants.length > 0);
  const outOfStock = hasVariants ? variantStock === 0 : product.stock === 0;

  useEffect(() => { trackRecent(product.id); }, [product.id]);

  const colorMap: Record<string, string> = {
    pink: "bg-pop-pink", cyan: "bg-pop-cyan", yellow: "bg-pop-yellow", orange: "bg-pop-orange",
    black: "bg-ink", white: "bg-white",
  };

  const handleAdd = () => {
    if (outOfStock) { toast.error("That size/color is sold out"); return; }
    if (hasVariants && qty > variantStock) { toast.error(`Only ${variantStock} available in ${size}/${color}`); return; }
    addToCart({ productId: product.id, size, color, qty });
    toast.success(`${product.name} added to bag`, { description: `${size} · ${color}` });
  };

  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-2 gap-10">
        <ProductGallery images={product.images && product.images.length > 0 ? product.images : [product.image]} alt={product.name} />

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex gap-2 mb-3">
            {product.badge && <span className="chip bg-pop-pink text-white">{product.badge}</span>}
            <span className="chip">{product.category}</span>
          </div>
          <h1 className="text-5xl">{product.name}</h1>
          <div className="mt-2"><Stars value={rating.avg} size={16} count={rating.count}/></div>
          <div className="mt-3 font-display text-3xl">{formatPrice(product.price)}</div>
          <p className="mt-5 text-muted-foreground">{product.description}</p>

          <div className="mt-6">
            <div className="font-bold text-sm mb-2 uppercase">Color {hasVariants && <span className="text-muted-foreground font-normal">— picking shows live stock</span>}</div>
            <div className="flex gap-2 flex-wrap">
              {product.colors.map((c) => {
                const avail = colorHasStock(product, c);
                return (
                  <button key={c} onClick={() => setColor(c)} disabled={!avail}
                    title={avail ? c : `${c} — sold out`}
                    className={`relative h-10 w-10 rounded-full border-[3px] border-ink ${colorMap[c] ?? "bg-muted"} ${color === c ? "ring-4 ring-pop-yellow ring-offset-2 ring-offset-paper" : ""} ${!avail ? "opacity-40 cursor-not-allowed" : ""}`}
                    aria-label={c}
                  >
                    {!avail && <span className="absolute inset-0 grid place-items-center text-ink font-bold">×</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <div className="font-bold text-sm mb-2 uppercase">Size</div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const avail = hasVariants
                  ? getVariantStock(product, s, color) > 0
                  : sizeHasStock(product, s);
                return (
                  <button key={s} onClick={() => setSize(s)} disabled={!avail}
                    title={avail ? s : `${s} — sold out in ${color}`}
                    className={`chip min-w-12 justify-center ${size === s ? "bg-ink text-paper" : ""} ${!avail ? "opacity-40 line-through cursor-not-allowed" : ""}`}>
                    {s}
                  </button>
                );
              })}
            </div>
            {hasVariants && !outOfStock && variantStock <= 5 && (
              <p className="text-xs font-bold text-pop-pink mt-2">Only {variantStock} left in {size} / {color}</p>
            )}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border-[3px] border-ink rounded-full bg-white">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2 font-bold">−</button>
              <span className="px-3 font-bold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-4 py-2 font-bold">+</button>
            </div>
            <button onClick={handleAdd} className="btn-pop flex-1 justify-center" disabled={outOfStock}>
              <ShoppingBag size={18}/> {outOfStock ? "Sold out" : "Add to bag"}
            </button>
            <WishlistButton productId={product.id}/>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 text-xs">
            <div className="sticker-sm rounded-xl p-3 bg-white"><Truck size={16} className="mb-1"/>Free ship $80+</div>
            <div className="sticker-sm rounded-xl p-3 bg-white"><RotateCcw size={16} className="mb-1"/>14-day returns</div>
            <div className="sticker-sm rounded-xl p-3 bg-white"><Shield size={16} className="mb-1"/>Quality promise</div>
          </div>
        </motion.div>
      </section>

      <Reviews productId={product.id}/>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-3xl mb-6">You'll also love</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <Link key={p.id} to="/product/$slug" params={{ slug: p.slug }} className="sticker rounded-2xl overflow-hidden bg-white hover:translate-y-[-3px] transition">
                <img src={p.image} alt={p.name} className="aspect-square object-cover w-full" loading="lazy"/>
                <div className="p-3 border-t-[3px] border-ink flex justify-between"><span className="font-bold truncate">{p.name}</span><span>{formatPrice(p.price)}</span></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed excludeId={product.id}/>
    </Layout>
  );
}
