import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { X, GitCompare } from "lucide-react";
import { clearCompare, removeCompare, useCompare, useProducts } from "@/lib/store";

export function CompareBar() {
  const ids = useCompare();
  const products = useProducts();
  const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,44rem)]"
        >
          <div className="sticker rounded-2xl bg-white p-3 flex items-center gap-3">
            <span className="chip bg-pop-yellow shrink-0"><GitCompare size={14}/> Compare</span>
            <div className="flex-1 flex gap-2 overflow-x-auto">
              {items.map((p) => (
                <motion.div key={p!.id} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="relative shrink-0">
                  <img src={p!.image} alt={p!.name} className="h-12 w-12 rounded-lg border-[3px] border-ink object-cover bg-pop-cyan"/>
                  <button onClick={() => removeCompare(p!.id)} aria-label={`Remove ${p!.name}`}
                    className="absolute -top-2 -right-2 h-5 w-5 grid place-items-center rounded-full border-2 border-ink bg-white">
                    <X size={10}/>
                  </button>
                </motion.div>
              ))}
            </div>
            <button onClick={clearCompare} className="chip text-xs shrink-0 hidden sm:inline-flex">Clear</button>
            <Link to="/compare" className="btn-pop shrink-0 text-sm">Compare {items.length}</Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
