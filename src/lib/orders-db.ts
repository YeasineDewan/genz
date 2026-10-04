import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Order, Product } from "./types";

export interface SalesOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  items: { productId: string; name: string; size: string; color: string; qty: number; price: number }[];
  item_count: number;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
}

/** Save a placed order to the backend so admins can see it from any device. */
export async function syncOrderToBackend(order: Order, products: Product[], paymentMethod = "card") {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id ?? null;
    const items = order.items.map((it) => {
      const p = products.find((x) => x.id === it.productId);
      return { ...it, name: p?.name ?? "Item", price: p?.price ?? 0 };
    });
    const { error } = await supabase.from("orders").insert({
      id: order.id,
      customer_id: uid,
      customer_name: order.shipping.name,
      customer_email: order.shipping.email ?? "",
      items,
      item_count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: order.subtotal ?? 0,
      shipping_fee: order.shippingFee ?? 0,
      discount: order.discount ?? 0,
      total: order.total,
      status: "pending",
      payment_method: paymentMethod,
      shipping: order.shipping as never,
    });
    if (error) console.warn("[orders] sync failed", error.message);
  } catch (e) {
    console.warn("[orders] sync failed", e);
  }
}

export async function syncOrderStatus(id: string, status: string) {
  await supabase.from("orders").update({ status }).eq("id", id);
}

/** Admin: live list of all orders in the backend. */
export function useSalesOrders() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, customer_name, customer_email, items, item_count, total, status, payment_method, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) setError(error.message);
    else { setError(null); setOrders((data ?? []) as unknown as SalesOrder[]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { orders, loading, error, reload: load };
}
