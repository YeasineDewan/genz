import { Link } from "@tanstack/react-router";
import { useProducts, useRecent, clearRecent, removeRecent, formatPrice } from "@/lib/store";
import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, History } from "lucide-react";

export function RecentlyViewed({ excludeId, title = "Recently viewed" }: { excludeId?: string; title?: string }) {
  const recent = useRecent();
  const products = useProducts();
  const scroller = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => recent
      .filter((id) => id !== excludeId)
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .slice(0, 12),
    [recent, products, excludeId],
  );

  if (items.length === 0) return null;

  const nudge = (dir: 1 | -1) => {
    scroller.current?.scrollBy({ left: dir * Math.max(240, (scroller.current.clientWidth || 600) * 0.8), behavior: "smooth" });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-3xl flex items-center gap-2"><History size={26}/> {title}</h2>
        <div className="flex items-center gap-2">
          <button onClick={clearRecent} className="chip hover:bg-pop-pink hover:text-white transition">Clear history</button>
          <Link to="/shop" className="chip">Browse more</Link>
          <div className="hidden sm:flex gap-1">
            <button aria-label="Scroll left" onClick={() => nudge(-1)} className="h-9 w-9 grid place-items-center rounded-full border-[3px] border-ink bg-white hover:bg-pop-yellow transition"><ChevronLeft size={16}/></button>
            <button aria-label="Scroll right" onClick={() => nudge(1)} className="h-9 w-9 grid place-items-center rounded-full border-[3px] border-ink bg-white hover:bg-pop-yellow transition"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      <div ref={scroller} className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(i * 0.04, 0.3) }}
            className="relative snap-start shrink-0 w-[200px] sm:w-[230px]"
          >
            <button
              aria-label={`Remove ${p.name} from history`}
              onClick={() => removeRecent(p.id)}
              className="absolute -top-2 -right-2 z-10 h-7 w-7 grid place-items-center rounded-full border-2 border-ink bg-white hover:bg-destructive hover:text-white transition"
            >
              <X size={12}/>
            </button>
            <Link to="/product/$slug" params={{ slug: p.slug }} className="block sticker rounded-2xl bg-white overflow-hidden hover:-translate-y-1 transition">
              <div className="aspect-square bg-pop-cyan">
                <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover mix-blend-multiply"/>
              </div>
              <div className="p-3">
                <div className="font-bold text-sm truncate">{p.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-display">{formatPrice(p.price)}</span>
                  <span className={`text-[10px] font-bold uppercase ${p.stock > 0 ? "text-muted-foreground" : "text-destructive"}`}>
                    {p.stock > 0 ? "In stock" : "Sold out"}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
