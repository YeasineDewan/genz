// Lightweight unread tracking for support chat. Kept in localStorage so it
// works without extra Supabase columns. Keys are scoped per audience:
//   - Admin inbox uses one shared record (all convs).
//   - Customer chat head is scoped by user id.
import { useEffect, useState } from "react";

const ADMIN_KEY = "genz.support.adminSeen";
const CUSTOMER_KEY = "genz.support.customerSeen"; // { [userId]: { [convId]: ts } }

type Map = Record<string, number>;

function read(key: string): Map {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(key) ?? "{}") as Map; }
  catch { return {}; }
}
function write(key: string, val: Map) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
  window.dispatchEvent(new Event("genz.support.seen"));
}

// ─── Admin ───
export function getAdminSeen(): Map { return read(ADMIN_KEY); }
export function markAdminSeen(convId: string, ts = Date.now()) {
  const m = getAdminSeen(); m[convId] = ts; write(ADMIN_KEY, m);
}
export function useAdminSeen(): Map {
  const [m, setM] = useState<Map>(() => getAdminSeen());
  useEffect(() => {
    const h = () => setM(getAdminSeen());
    window.addEventListener("genz.support.seen", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("genz.support.seen", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return m;
}

// ─── Customer ───
function readCustomer(userId: string): Map {
  if (typeof window === "undefined") return {};
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}") as Record<string, Map>;
    return all[userId] ?? {};
  } catch { return {}; }
}
export function markCustomerSeen(userId: string, convId: string, ts = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}") as Record<string, Map>;
    const mine = all[userId] ?? {};
    mine[convId] = ts;
    all[userId] = mine;
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event("genz.support.seen"));
  } catch { /* ignore */ }
}
export function useCustomerSeen(userId: string | undefined): Map {
  const [m, setM] = useState<Map>(() => (userId ? readCustomer(userId) : {}));
  useEffect(() => {
    if (!userId) return;
    const h = () => setM(readCustomer(userId));
    h();
    window.addEventListener("genz.support.seen", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("genz.support.seen", h);
      window.removeEventListener("storage", h);
    };
  }, [userId]);
  return m;
}
