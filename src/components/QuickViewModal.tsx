import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { addToCart, formatPrice, useProductRating } from "@/lib/store";
import type { Product } from "@/lib/types";
import { Stars } from "./Stars";
import { WishlistButton } from "./WishlistButton";
import { toast } from "sonner";

export function QuickViewModal({ product, onClose, onAdd }: { product: Product | null; onClose: () => void; onAdd?: (product: Product) => void }) {
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const rating = useProductRating(product?.id ?? "");

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-ink/60 backdrop-blur-sm grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-full max-w-3xl sticker rounded-2xl bg-white overflow-hidden grid md:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-pop-cyan aspect-square">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply"/>
            </div>
            <div className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-2xl">{product.name}</h3>
                <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full border-2 border-ink bg-white"><X size={14}/></button>
              </div>
              <Stars value={rating.avg} size={14} count={rating.count}/>
              <div className="font-display text-3xl mt-2">{formatPrice(product.price)}</div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{product.description}</p>

              <div className="mt-4">
                <div className="text-xs uppercase font-bold mb-1">Size</div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button key={s} onClick={() => setSize(s)}
                      className={`chip ${size === s ? "bg-ink text-paper" : ""}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs uppercase font-bold mb-1">Color</div>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`chip ${color === c ? "bg-ink text-paper" : ""}`}>{c}</button>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-5 flex gap-2 items-center">
                <WishlistButton productId={product.id}/>
                <button
                  onClick={() => {
                    const s = size || product.sizes[0];
                    const c = color || product.colors[0];
                    addToCart({ productId: product.id, size: s, color: c, qty: 1 });
                    toast.success(`${product.name} added`, { description: `${s} · ${c}` });
                    onClose();
                  }}
                  className="btn-pop flex-1 justify-center"><ShoppingBag size={16}/> Add to bag</button>
                <Link to="/product/$slug" params={{ slug: product.slug }} onClick={onClose} className="chip"><ExternalLink size={12}/> Details</Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
