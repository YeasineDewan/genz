import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X, ArrowRight } from "lucide-react";
import { useProducts, formatPrice } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const products = useProducts();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => { if (!open) { setQ(""); setActive(0); } }, [open]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 8);
    return products
      .filter((p) => p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, products]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const m = matches[active];
        if (m) { navigate({ to: "/product/$slug", params: { slug: m.slug } }); onClose(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, matches, active, navigate, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-ink/50 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-xl sticker rounded-2xl bg-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b-[3px] border-ink bg-pop-yellow">
              <Search size={20}/>
              <input
                autoFocus
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search products, categories..."
                className="flex-1 bg-transparent outline-none font-bold"
              />
              <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-full bg-white border-2 border-ink"><X size={14}/></button>
            </div>
            <ul className="max-h-[50vh] overflow-auto">
              {matches.length === 0 ? (
                <li className="p-6 text-center text-muted-foreground text-sm">No products match "{q}"</li>
              ) : matches.map((p, i) => (
                <li key={p.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { navigate({ to: "/product/$slug", params: { slug: p.slug } }); onClose(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i === active ? "bg-pop-cyan/40" : ""}`}
                  >
                    <img src={p.image} className="h-12 w-12 rounded border-2 border-ink object-cover" alt=""/>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground uppercase">{p.category}</div>
                    </div>
                    <div className="font-display text-lg">{formatPrice(p.price)}</div>
                    <ArrowRight size={16} className="text-muted-foreground"/>
                  </button>
                </li>
              ))}
            </ul>
            <div className="px-4 py-2 border-t-2 border-ink/10 text-[10px] uppercase font-bold text-muted-foreground flex gap-3">
              <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
