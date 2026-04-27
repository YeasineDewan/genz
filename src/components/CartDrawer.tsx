import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart, useProducts, removeFromCart, updateCartQty, cartTotal, formatPrice } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cart = useCart();
  const products = useProducts();
  const total = cartTotal(cart, products);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-ink/40 z-50" />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-paper z-50 border-l-[3px] border-ink flex flex-col"
          >
            <div className="p-4 border-b-[3px] border-ink flex items-center justify-between bg-pop-yellow">
              <h3 className="text-2xl">Your Bag</h3>
              <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full border-2 border-ink bg-white"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-6xl mb-3">🛍️</div>
                  <p className="font-bold">Your bag is empty.</p>
                  <p className="text-sm text-muted-foreground">Time to fix that.</p>
                </div>
              )}
              {cart.map((item, i) => {
                const p = products.find((x) => x.id === item.productId);
                if (!p) return null;
                return (
                  <div key={i} className="sticker rounded-xl p-3 flex gap-3">
                    <img src={p.image} alt={p.name} width={80} height={80} className="rounded-lg border-2 border-ink object-cover h-20 w-20" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{item.size} · {item.color}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 border-2 border-ink rounded-full">
                          <button onClick={() => updateCartQty(i, item.qty - 1)} className="px-2 py-1"><Minus size={12}/></button>
                          <span className="px-2 text-sm font-bold">{item.qty}</span>
                          <button onClick={() => updateCartQty(i, item.qty + 1)} className="px-2 py-1"><Plus size={12}/></button>
                        </div>
                        <div className="font-bold">{formatPrice(p.price * item.qty)}</div>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(i)} className="self-start text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t-[3px] border-ink space-y-3 bg-white">
              <div className="flex items-center justify-between text-lg">
                <span className="font-bold">Subtotal</span>
                <span className="font-display text-2xl">{formatPrice(total)}</span>
              </div>
              <Link to="/checkout" onClick={onClose} className="btn-pop w-full justify-center">Checkout →</Link>
              <Link to="/cart" onClick={onClose} className="btn-pop ghost w-full justify-center text-sm">View full cart</Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
