import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSalesOrders, syncOrderStatus, type SalesOrder } from "@/lib/orders-db";
import { formatPrice } from "@/lib/store";
import { toast } from "sonner";

const STATUSES = ["pending", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"];
const label = (s: string) => s.replace(/_/g, " ");

function useMyOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) { setOrders([]); setLoading(false); return; }
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, customer_email, items, item_count, total, status, payment_method, created_at")
      .eq("customer_id", uid)
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as SalesOrder[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
    const ch = supabase.channel("my-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);
  return { orders, loading };
}

function OrderRow({ o, admin, onStatus }: { o: SalesOrder; admin?: boolean; onStatus?: (s: string) => void }) {
  return (
    <div className="rounded-xl border-2 border-ink/15 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold">#{o.id}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(o.created_at).toLocaleString()}{admin && ` · ${o.customer_name} (${o.customer_email})`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-xl">{formatPrice(Number(o.total))}</span>
          {admin ? (
            <select aria-label="Order status" value={o.status} onChange={(e) => onStatus?.(e.target.value)}
              className="rounded-lg border-2 border-ink px-2 py-1 text-sm font-bold capitalize">
              {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          ) : (
            <span className="chip capitalize">{label(o.status)}</span>
          )}
        </div>
      </div>
      <ul className="text-sm divide-y divide-ink/10">
        {o.items.map((it, i) => (
          <li key={i} className="flex justify-between py-1">
            <span>{it.name} <span className="text-muted-foreground">· {it.size} · {it.color} × {it.qty}</span></span>
            <span>{formatPrice(it.price * it.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="text-xs text-muted-foreground">{o.item_count} item(s) · {o.payment_method}</div>
    </div>
  );
}

export function AdminLiveOrders() {
  const { orders, loading, error } = useSalesOrders();
  const revenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const change = async (id: string, s: string) => {
    const { error } = await supabase.from("orders").update({ status: s }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Status updated");
  };
  return (
    <div className="sticker rounded-2xl bg-white p-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-2xl">Live sales</h3>
        <div className="text-sm"><b>{orders.length}</b> orders · <b>{formatPrice(revenue)}</b> revenue</div>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : error ? <p className="text-sm text-destructive">{error}</p>
        : orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p>
        : <div className="space-y-3 max-h-[600px] overflow-auto">{orders.map((o) => <OrderRow key={o.id} o={o} admin onStatus={(s) => change(o.id, s)} />)}</div>}
    </div>
  );
}

export function CustomerOrderHistory() {
  const { orders, loading } = useMyOrders();
  if (loading || orders.length === 0) return null;
  return (
    <div className="sticker rounded-2xl bg-white p-5 space-y-3">
      <h3 className="text-2xl">Order history</h3>
      {orders.map((o) => <OrderRow key={o.id} o={o} />)}
    </div>
  );
}

export { syncOrderStatus };
