import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2, Truck, Lock, ShieldCheck, Sparkles, Tag } from "lucide-react";
import {
  useCart, useProducts, removeFromCart, updateCartQty, cartTotal, formatPrice, addToCart,
} from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";

const FREE_SHIP_THRESHOLD = 80;

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cart = useCart();
  const products = useProducts();
  const total = cartTotal(cart, products);
  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_SHIP_THRESHOLD) * 100);
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);

  // Smart cross-sell: pick popular products not already in the cart
  const recommendations = useMemo(() => {
    const inCart = new Set(cart.map((c) => c.productId));
    return products.filter((p) => !inCart.has(p.id) && p.stock > 0).slice(0, 4);
  }, [products, cart]);


  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50"
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-paper z-50 border-l-[3px] border-ink flex flex-col"
            role="dialog" aria-label="Shopping bag"
          >
            <div className="p-4 border-b-[3px] border-ink bg-pop-yellow space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl">Your Bag</h3>
                <button
                  onClick={onClose}
                  className="h-9 w-9 grid place-items-center rounded-full border-2 border-ink bg-white hover:rotate-90 transition-transform"
                  aria-label="Close"
                >
                  <X size={18}/>
                </button>
              </div>
              {cart.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="flex items-center gap-1"><Truck size={12}/> Free shipping</span>
                    <span>
                      {remaining === 0
                        ? "🎉 You unlocked free shipping!"
                        : `${formatPrice(remaining)} away`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white border-2 border-ink overflow-hidden">
                    <motion.div
                      className="h-full bg-pop-pink"
                      initial={false}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="text-7xl mb-3">🛍️</div>
                  <p className="font-bold mb-1">Your bag is empty.</p>
                  <p className="text-sm text-muted-foreground mb-4">Time to fix that.</p>
                  <Link to="/shop" onClick={onClose} className="btn-pop inline-flex">Browse the drop</Link>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {cart.map((item, i) => {
                  const p = products.find((x) => x.id === item.productId);
                  if (!p) return null;
                  return (
                    <motion.div
                      key={`${item.productId}-${item.size}-${item.color}`}
                      layout
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30, height: 0, marginTop: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 28 }}
                      className="sticker rounded-xl p-3 flex gap-3 bg-white"
                    >
                      <img src={p.image} alt={p.name} width={80} height={80} className="rounded-lg border-2 border-ink object-cover h-20 w-20" loading="lazy" />
                      <div className="flex-1 min-w-0">
                        <Link to="/product/$slug" params={{ slug: p.slug }} onClick={onClose} className="font-bold truncate hover:underline block">
                          {p.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{item.size} · {item.color}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 border-2 border-ink rounded-full bg-white">
                            <button onClick={() => updateCartQty(i, item.qty - 1)} className="px-2 py-1 hover:bg-pop-yellow rounded-l-full" aria-label="Decrease"><Minus size={12}/></button>
                            <span className="px-2 text-sm font-bold tabular-nums">{item.qty}</span>
                            <button onClick={() => updateCartQty(i, item.qty + 1)} className="px-2 py-1 hover:bg-pop-yellow rounded-r-full" aria-label="Increase"><Plus size={12}/></button>
                          </div>
                          <div className="font-bold tabular-nums">{formatPrice(p.price * item.qty)}</div>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(i)} className="self-start text-muted-foreground hover:text-destructive transition" aria-label="Remove">
                        <Trash2 size={16}/>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {cart.length > 0 && recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="pt-3 mt-3 border-t-2 border-dashed border-ink/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-pop-pink"/>
                    <h4 className="font-bold text-sm uppercase tracking-wide">You may also like</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recommendations.map((p) => (
                      <motion.div
                        key={p.id}
                        whileHover={{ y: -2 }}
                        className="rounded-xl border-2 border-ink bg-white p-2 text-xs"
                      >
                        <Link to="/product/$slug" params={{ slug: p.slug }} onClick={onClose}>
                          <img src={p.image} alt={p.name} className="w-full h-20 object-cover rounded-lg border border-ink/40 mb-1" loading="lazy"/>
                          <div className="font-bold truncate">{p.name}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-display">{formatPrice(p.price)}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation();
                                addToCart({ productId: p.id, size: p.sizes[0] ?? "OS", color: p.colors[0] ?? "default", qty: 1 });
                              }}
                              className="h-6 w-6 grid place-items-center rounded-full border-2 border-ink bg-pop-yellow hover:bg-pop-pink hover:text-white transition"
                              aria-label="Add"
                            ><Plus size={12}/></button>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t-[3px] border-ink space-y-3 bg-white">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-bold">Subtotal</span>
                  <motion.span
                    key={total}
                    initial={{ scale: 1.1 }} animate={{ scale: 1 }}
                    className="font-display text-2xl tabular-nums"
                  >
                    {formatPrice(total)}
                  </motion.span>
                </div>
                <p className="text-xs text-muted-foreground">Shipping & taxes calculated at checkout.</p>
                <Link to="/checkout" onClick={onClose} className="btn-pop w-full justify-center">
                  <Lock size={14}/> Secure checkout →
                </Link>
                <Link to="/cart" onClick={onClose} className="btn-pop ghost w-full justify-center text-sm">
                  View full cart
                </Link>
                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><ShieldCheck size={12}/> SSL secured</span>
                  <span>·</span>
                  <span>14-day returns</span>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
