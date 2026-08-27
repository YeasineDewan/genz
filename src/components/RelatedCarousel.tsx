import { useRef, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/store";
import type { Product } from "@/lib/types";
import { WishlistButton } from "./WishlistButton";

export function RelatedCarousel({
  products,
  title = "You'll also love",
}: {
  products: Product[];
  title?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  useEffect(() => {
    sync();
  }, [products.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">Picked from the same vibe & category.</p>
        </div>
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => scrollBy(-1)}
            disabled={atStart}
            aria-label="Previous products"
            className="h-10 w-10 grid place-items-center rounded-full border-[3px] border-ink bg-white shadow-sticker-sm disabled:opacity-30 hover:translate-y-[-2px] transition"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            disabled={atEnd}
            aria-label="Next products"
            className="h-10 w-10 grid place-items-center rounded-full border-[3px] border-ink bg-white shadow-sticker-sm disabled:opacity-30 hover:translate-y-[-2px] transition"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={sync}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-3 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="snap-start shrink-0 w-[70%] sm:w-[45%] md:w-[30%] lg:w-[23%]"
          >
            <div className="relative group sticker rounded-2xl overflow-hidden bg-white hover:translate-y-[-3px] transition h-full">
              <div className="absolute top-2 right-2 z-10">
                <WishlistButton productId={p.id} size={16} />
              </div>
              <Link to="/product/$slug" params={{ slug: p.slug }} className="block">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="aspect-square object-cover w-full group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-3 border-t-[3px] border-ink flex items-center justify-between gap-2">
                  <span className="font-bold truncate">{p.name}</span>
                  <span className="font-display">{formatPrice(p.price)}</span>
                </div>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
