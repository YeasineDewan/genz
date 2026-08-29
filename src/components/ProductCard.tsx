import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatPrice, useProductRating } from "@/lib/store";
import { Stars } from "./Stars";
import { WishlistButton } from "./WishlistButton";
import { CompareButton } from "./CompareButton";
import { Eye } from "lucide-react";

const tilts = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "rotate-0"];
const bgs = ["bg-pop-pink", "bg-pop-cyan", "bg-pop-yellow", "bg-pop-orange"];

export function ProductCard({
  product,
  index = 0,
  onQuickView,
}: {
  product: Product;
  index?: number;
  onQuickView?: (p: Product) => void;
}) {
  const tilt = tilts[index % tilts.length];
  const bg = bgs[index % bgs.length];
  const rating = useProductRating(product.id);
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.05 }}
      className="relative group"
    >
      {/* Floating actions (outside Link to avoid nested anchors) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
        <WishlistButton productId={product.id}/>
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView(product); }}
            className="grid place-items-center h-9 w-9 rounded-full border-[3px] border-ink bg-white shadow-sticker-sm hover:translate-y-[-2px] transition"
            aria-label="Quick view"
          >
            <Eye size={16}/>
          </button>
        )}
      </div>

      <Link to="/product/$slug" params={{ slug: product.slug }} className={`block sticker rounded-2xl overflow-hidden bg-white hover:translate-y-[-3px] transition ${tilt} hover:rotate-0`}>
        <div className={`relative aspect-square overflow-hidden ${bg}`}>
          <img src={product.image} alt={product.name} width={800} height={800} loading="lazy"
               className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition duration-500" />
          {product.badge && (
            <span className="absolute top-3 left-3 chip bg-ink text-paper">{product.badge}</span>
          )}
          {product.stock === 0 && (
            <span className="absolute bottom-3 left-3 chip bg-destructive text-white">Sold out</span>
          )}
          {lowStock && (
            <span className="absolute bottom-3 left-3 chip bg-pop-orange">Only {product.stock} left</span>
          )}
        </div>
        <div className="p-4 border-t-[3px] border-ink">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold truncate">{product.name}</div>
              <div className="text-xs uppercase text-muted-foreground">{product.category}</div>
            </div>
            <div className="font-display text-xl">{formatPrice(product.price)}</div>
          </div>
          <div className="mt-2">
            <Stars value={rating.avg} size={12} count={rating.count}/>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
