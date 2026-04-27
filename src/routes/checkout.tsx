import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useCart, useProducts, useUser, cartTotal, clearCart, placeOrder, formatPrice } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — GenZ" }] }),
  component: Checkout,
});

function Checkout() {
  const cart = useCart();
  const products = useProducts();
  const user = useUser();
  const navigate = useNavigate();
  const total = cartTotal(cart, products);
  const ship = total >= 80 || total === 0 ? 0 : 8;
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    address: "", city: "", zip: "", country: "USA",
    card: "", exp: "", cvc: "",
  });
  const [loading, setLoading] = useState(false);

  if (cart.length === 0) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-24 px-4">
          <h1 className="text-4xl">Nothing to check out.</h1>
          <Link to="/shop" className="btn-pop mt-6 inline-flex">Go shop</Link>
        </div>
      </Layout>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const order = placeOrder({
        userId: user?.id ?? "guest",
        items: cart,
        total: total + ship,
        shipping: { name: form.name, address: form.address, city: form.city, zip: form.zip, country: form.country },
      });
      clearCart();
      setLoading(false);
      toast.success("Order placed! 🎉");
      navigate({ to: "/order/$id", params: { id: order.id } });
    }, 900);
  };

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 outline-none focus:bg-pop-yellow/40" />
  );

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-5xl mb-8">Checkout</h1>
        <form onSubmit={submit} className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-6">
            <div className="sticker rounded-2xl bg-white p-6 space-y-3">
              <h3 className="text-2xl mb-2">Contact</h3>
              <Input required type="email" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/>
              <Input required placeholder="Full name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/>
            </div>
            <div className="sticker rounded-2xl bg-white p-6 space-y-3">
              <h3 className="text-2xl mb-2">Shipping</h3>
              <Input required placeholder="Street address" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})}/>
              <div className="grid grid-cols-2 gap-3">
                <Input required placeholder="City" value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})}/>
                <Input required placeholder="ZIP" value={form.zip} onChange={(e)=>setForm({...form,zip:e.target.value})}/>
              </div>
              <Input required placeholder="Country" value={form.country} onChange={(e)=>setForm({...form,country:e.target.value})}/>
            </div>
            <div className="sticker rounded-2xl bg-pop-cyan p-6 space-y-3">
              <h3 className="text-2xl mb-2">Payment <span className="text-xs font-normal">(demo only)</span></h3>
              <Input required placeholder="Card number" value={form.card} onChange={(e)=>setForm({...form,card:e.target.value})}/>
              <div className="grid grid-cols-2 gap-3">
                <Input required placeholder="MM/YY" value={form.exp} onChange={(e)=>setForm({...form,exp:e.target.value})}/>
                <Input required placeholder="CVC" value={form.cvc} onChange={(e)=>setForm({...form,cvc:e.target.value})}/>
              </div>
              <p className="text-xs">No real charges — wire up your Laravel API or Stripe later.</p>
            </div>
          </div>

          <aside className="sticker rounded-2xl bg-pop-yellow p-6 h-fit space-y-3 lg:sticky lg:top-32">
            <h3 className="text-2xl">Order</h3>
            <div className="space-y-2 max-h-64 overflow-auto">
              {cart.map((it, i) => {
                const p = products.find((x) => x.id === it.productId);
                if (!p) return null;
                return (
                  <div key={i} className="flex gap-2 text-sm">
                    <img src={p.image} className="h-12 w-12 rounded border-2 border-ink object-cover" alt=""/>
                    <div className="flex-1 min-w-0"><div className="font-bold truncate">{p.name}</div><div className="text-xs">{it.size} · ×{it.qty}</div></div>
                    <div className="font-bold">{formatPrice(p.price * it.qty)}</div>
                  </div>
                );
              })}
            </div>
            <div className="border-t-2 border-ink pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(total)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{ship ? formatPrice(ship) : "FREE"}</span></div>
              <div className="flex justify-between font-display text-2xl pt-2"><span>Total</span><span>{formatPrice(total+ship)}</span></div>
            </div>
            <button disabled={loading} type="submit" className="btn-pop w-full justify-center disabled:opacity-60">
              {loading ? "Processing..." : `Pay ${formatPrice(total+ship)}`}
            </button>
          </aside>
        </form>
      </section>
    </Layout>
  );
}
