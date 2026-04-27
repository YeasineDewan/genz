import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useUser, useOrders, useProducts, formatPrice } from "@/lib/store";
import { useEffect } from "react";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My account — GenZ" }] }),
  component: Account,
});

function Account() {
  const user = useUser();
  const navigate = useNavigate();
  const orders = useOrders(user?.id);
  const products = useProducts();

  useEffect(() => { if (!user) navigate({ to: "/login" }); }, [user, navigate]);
  if (!user) return null;

  return (
    <Layout>
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="sticker rounded-2xl bg-pop-pink text-white p-6 mb-8">
          <div className="text-sm uppercase font-bold opacity-80">Hey 👋</div>
          <h1 className="text-4xl">{user.name}</h1>
          <div className="text-sm">{user.email}</div>
        </div>

        <h2 className="text-3xl mb-4">Your orders</h2>
        {orders.length === 0 ? (
          <div className="sticker rounded-2xl bg-white p-10 text-center">
            <p className="font-bold mb-3">No orders yet.</p>
            <Link to="/shop" className="btn-pop">Start shopping</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} to="/order/$id" params={{ id: o.id }} className="sticker rounded-2xl bg-white p-4 flex items-center gap-4 hover:translate-y-[-2px] transition">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((it, i) => {
                    const p = products.find((x) => x.id === it.productId);
                    return p ? <img key={i} src={p.image} className="h-12 w-12 rounded-full border-[3px] border-ink object-cover" alt=""/> : null;
                  })}
                </div>
                <div className="flex-1">
                  <div className="font-bold font-mono text-sm">#{o.id.slice(0,8)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} item(s)</div>
                </div>
                <span className="chip bg-pop-yellow">{o.status}</span>
                <div className="font-display text-xl">{formatPrice(o.total)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
