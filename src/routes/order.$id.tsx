import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useProducts, formatPrice, useOrder, cancelOrder } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";
import { CheckCircle2, Package, Truck, Home, Clock, MapPin, Copy, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order status — GenZ" }] }),
  component: OrderPage,
});

const STEPS: { key: OrderStatus; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: "pending", label: "Order placed", Icon: CheckCircle2 },
  { key: "processing", label: "Processing", Icon: Package },
  { key: "shipped", label: "Shipped", Icon: Truck },
  { key: "out_for_delivery", label: "Out for delivery", Icon: MapPin },
  { key: "delivered", label: "Delivered", Icon: Home },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderPage() {
  const { id } = Route.useParams();
  const order = useOrder(id);
  const products = useProducts();
  if (!order) throw notFound();

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const subtotal = order.items.reduce((sum, it) => {
    const p = products.find((x) => x.id === it.productId);
    return sum + (p?.price ?? 0) * it.qty;
  }, 0);
  const shipping = order.total - subtotal;

  const copyTracking = () => {
    if (!order.trackingNumber) return;
    navigator.clipboard.writeText(order.trackingNumber);
    toast.success("Tracking number copied");
  };

  const canCancel = order.status === "pending" || order.status === "processing";
  const handleCancel = () => {
    if (!canCancel) return;
    if (!confirm("Cancel this order? Items will be restocked.")) return;
    cancelOrder(order.id, "Cancelled by customer");
    toast.success("Order cancelled");
  };

  return (
    <Layout>
      <section className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        {/* Header */}
        <div className="sticker rounded-2xl bg-pop-pink text-white p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase font-bold opacity-80">Order #{order.id.slice(0, 8)}</div>
              <h1 className="text-4xl mt-1">{STATUS_LABEL[order.status]}</h1>
              <p className="text-sm mt-1 opacity-90">Placed {new Date(order.createdAt).toLocaleString()}</p>
            </div>
            {order.status !== "cancelled" && (
              <span className="chip bg-white text-ink">{STATUS_LABEL[order.status]}</span>
            )}
          </div>
        </div>

        {/* Tracking timeline */}
        {order.status !== "cancelled" && (
          <div className="sticker rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="text-2xl">Tracking</h2>
              {order.trackingNumber && (
                <button onClick={copyTracking} className="chip">
                  <span className="font-mono">{order.trackingNumber}</span> <Copy size={12}/>
                </button>
              )}
            </div>

            {/* Horizontal stepper (desktop) */}
            <div className="hidden md:block">
              <div className="relative flex justify-between">
                <div className="absolute top-6 left-0 right-0 h-1 bg-ink/15 rounded-full"/>
                <div
                  className="absolute top-6 left-0 h-1 bg-pop-pink rounded-full transition-all"
                  style={{ width: `${(Math.max(0, currentIdx) / (STEPS.length - 1)) * 100}%` }}
                />
                {STEPS.map((s, i) => {
                  const done = i <= currentIdx;
                  return (
                    <div key={s.key} className="relative z-10 flex flex-col items-center w-1/5">
                      <div className={`h-12 w-12 rounded-full border-[3px] border-ink grid place-items-center ${done ? "bg-pop-pink text-white" : "bg-white text-ink"}`}>
                        <s.Icon size={20}/>
                      </div>
                      <div className={`mt-2 text-xs font-bold text-center ${done ? "" : "text-muted-foreground"}`}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vertical timeline (mobile + event log) */}
            <ol className="md:mt-8 space-y-4">
              {(order.tracking ?? []).slice().reverse().map((ev, i) => (
                <li key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full border-2 border-ink bg-pop-yellow grid place-items-center">
                      <Clock size={14}/>
                    </div>
                    {i < (order.tracking?.length ?? 0) - 1 && <div className="flex-1 w-0.5 bg-ink/20 my-1"/>}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="font-bold">{STATUS_LABEL[ev.status]}</div>
                    {ev.note && <div className="text-sm text-muted-foreground">{ev.note}</div>}
                    <div className="text-xs text-muted-foreground">{new Date(ev.at).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Items */}
          <div className="sticker rounded-2xl bg-white p-6">
            <h2 className="text-2xl mb-4">Items</h2>
            <div className="space-y-3">
              {order.items.map((it, i) => {
                const p = products.find((x) => x.id === it.productId);
                if (!p) return null;
                return (
                  <div key={i} className="flex gap-3 items-center">
                    <img src={p.image} className="h-14 w-14 rounded border-2 border-ink object-cover" alt=""/>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{it.size} · {it.color} · ×{it.qty}</div>
                    </div>
                    <div className="font-bold">{formatPrice(p.price * it.qty)}</div>
                  </div>
                );
              })}
            </div>
            <div className="border-t-2 border-ink mt-4 pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping > 0 ? formatPrice(shipping) : "FREE"}</span></div>
              <div className="flex justify-between font-display text-2xl pt-2"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </div>

          {/* Shipping address */}
          <div className="sticker rounded-2xl bg-pop-cyan p-6">
            <h2 className="text-2xl mb-4">Ship to</h2>
            <div className="space-y-1">
              <div className="font-bold text-lg">{order.shipping.name}</div>
              <div>{order.shipping.address}</div>
              <div>{order.shipping.city}, {order.shipping.zip}</div>
              <div>{order.shipping.country}</div>
            </div>
            {order.carrier && (
              <div className="mt-5 pt-4 border-t-2 border-ink/20 text-sm">
                <div className="font-bold">Carrier</div>
                <div>{order.carrier}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/shop" className="btn-pop">Keep shopping</Link>
          <Link to="/account" className="btn-pop ghost">My orders</Link>
          {canCancel && (
            <button onClick={handleCancel} className="btn-pop bg-destructive text-white">
              <XCircle size={16}/> Cancel order
            </button>
          )}
        </div>
      </section>
    </Layout>
  );
}
