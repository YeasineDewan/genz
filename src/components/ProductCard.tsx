import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/store";

const tilts = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "rotate-0"];
const bgs = ["bg-pop-pink", "bg-pop-cyan", "bg-pop-yellow", "bg-pop-orange"];

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const tilt = tilts[index % tilts.length];
  const bg = bgs[index % bgs.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.4, delay: (index % 4) * 0.05 }}
    >
      <Link to="/product/$slug" params={{ slug: product.slug }} className={`group block sticker rounded-2xl overflow-hidden bg-white hover:translate-y-[-3px] transition ${tilt} hover:rotate-0`}>
        <div className={`relative aspect-square overflow-hidden ${bg}`}>
          <img src={product.image} alt={product.name} width={800} height={800} loading="lazy"
               className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition duration-500" />
          {product.badge && (
            <span className="absolute top-3 left-3 chip bg-ink text-paper">{product.badge}</span>
          )}
        </div>
        <div className="p-4 border-t-[3px] border-ink flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-bold truncate">{product.name}</div>
            <div className="text-xs uppercase text-muted-foreground">{product.category}</div>
          </div>
          <div className="font-display text-xl">{formatPrice(product.price)}</div>
        </div>
      </Link>
    </motion.div>
  );
}
