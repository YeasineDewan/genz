import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { getOrders, useProducts, formatPrice } from "@/lib/store";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order confirmed — GenZ" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const order = getOrders().find((o) => o.id === id);
  const products = useProducts();
  if (!order) throw notFound();

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto text-pop-pink" size={72} />
        <h1 className="text-5xl mt-4">You're locked in.</h1>
        <p className="text-muted-foreground mt-2">Order <span className="font-mono">#{order.id.slice(0, 8)}</span> placed. We'll email tracking soon.</p>

        <div className="sticker rounded-2xl bg-white p-6 mt-8 text-left space-y-3">
          {order.items.map((it, i) => {
            const p = products.find((x) => x.id === it.productId);
            if (!p) return null;
            return (
              <div key={i} className="flex gap-3 items-center">
                <img src={p.image} className="h-14 w-14 rounded border-2 border-ink object-cover" alt=""/>
                <div className="flex-1"><div className="font-bold">{p.name}</div><div className="text-xs">{it.size} · ×{it.qty}</div></div>
                <div className="font-bold">{formatPrice(p.price * it.qty)}</div>
              </div>
            );
          })}
          <div className="border-t-2 border-ink pt-3 flex justify-between font-display text-2xl"><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>

        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <Link to="/shop" className="btn-pop">Keep shopping</Link>
          <Link to="/account" className="btn-pop ghost">My orders</Link>
        </div>
      </section>
    </Layout>
  );
}
