import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { CouponInput } from "@/components/CouponInput";
import {
  useCart, useProducts, removeFromCart, updateCartQty,
  cartTotal, formatPrice, trackFunnel,
  useAppliedCoupon, validateCoupon,
} from "@/lib/store";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — GenZ" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const products = useProducts();
  const applied = useAppliedCoupon();
  const total = cartTotal(cart, products);
  const ship = total >= 80 || total === 0 ? 0 : 8;
  const couponResult = applied ? validateCoupon(applied, total) : null;
  const discount = couponResult?.ok ? couponResult.discount : 0;
  const grand = Math.max(0, total + ship - discount);

  useEffect(() => { if (cart.length > 0) trackFunnel("cart_viewed"); }, []);

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-5xl mb-8">Your bag</h1>
        {cart.length === 0 ? (
          <div className="sticker rounded-2xl bg-white p-12 text-center">
            <div className="text-6xl mb-2">🛍️</div>
            <p className="font-bold mb-4">Empty. For now.</p>
            <Link to="/shop" className="btn-pop">Start shopping</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-3">
              {cart.map((item, i) => {
                const p = products.find((x) => x.id === item.productId);
                if (!p) return null;
                return (
                  <div key={i} className="sticker rounded-2xl bg-white p-4 flex gap-4">
                    <img src={p.image} alt={p.name} className="h-24 w-24 rounded-xl border-2 border-ink object-cover" loading="lazy"/>
                    <div className="flex-1">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{item.size} · {item.color}</div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex items-center border-2 border-ink rounded-full">
                          <button onClick={() => updateCartQty(i, item.qty - 1)} aria-label="Decrease quantity" className="px-2 py-1"><Minus size={12}/></button>
                          <span className="px-2 font-bold text-sm">{item.qty}</span>
                          <button onClick={() => updateCartQty(i, item.qty + 1)} aria-label="Increase quantity" className="px-2 py-1"><Plus size={12}/></button>
                        </div>
                        <button onClick={() => removeFromCart(i)} className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-sm"><Trash2 size={14}/> Remove</button>
                      </div>
                    </div>
                    <div className="font-display text-xl">{formatPrice(p.price * item.qty)}</div>
                  </div>
                );
              })}
            </div>
            <aside className="sticker rounded-2xl bg-pop-yellow p-6 h-fit space-y-3">
              <h3 className="text-2xl">Summary</h3>
              <CouponInput subtotal={total}/>
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-pop-pink font-bold">
                  <span>Discount ({applied})</span><span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm"><span>Shipping</span><span>{ship === 0 ? "FREE" : formatPrice(ship)}</span></div>
              <div className="border-t-2 border-ink pt-3 flex justify-between font-display text-2xl"><span>Total</span><span>{formatPrice(grand)}</span></div>
              <Link to="/checkout" className="btn-pop w-full justify-center mt-2">Checkout →</Link>
            </aside>
          </div>
        )}
      </section>
    </Layout>
  );
}
