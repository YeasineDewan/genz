// Lightweight recommendation analytics stored in localStorage so admins
// can inspect engagement without a backend. Fire-and-forget from the UI.
export type RecoEventType = "impression" | "click";

export interface RecoEvent {
  type: RecoEventType;
  productId?: string;    // omitted for batched "impression" events
  productIds?: string[]; // for batched impressions
  reason: string;
  position?: number;     // 0-based index in the rendered list
  offset?: number;       // pagination offset when the event fired
  userId?: string;
  at: number;
  session: string;       // per-tab session id
}

const KEY = "genz.reco.events";
const MAX = 500;

function getSession(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = sessionStorage.getItem("genz.reco.session");
    if (existing) return existing;
    const id = `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    sessionStorage.setItem("genz.reco.session", id);
    return id;
  } catch {
    return "nosession";
  }
}

function push(evt: RecoEvent) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: RecoEvent[] = raw ? JSON.parse(raw) : [];
    list.push(evt);
    // keep only the last MAX events
    const trimmed = list.length > MAX ? list.slice(list.length - MAX) : list;
    localStorage.setItem(KEY, JSON.stringify(trimmed));
    // also emit a browser CustomEvent so any dashboard can subscribe live
    window.dispatchEvent(new CustomEvent("genz:reco", { detail: evt }));
  } catch {
    /* quota or serialization error — ignore */
  }
}

export function trackRecoImpression(opts: {
  productIds: string[];
  reason: string;
  offset?: number;
  userId?: string;
}) {
  if (!opts.productIds.length) return;
  push({
    type: "impression",
    productIds: opts.productIds,
    reason: opts.reason,
    offset: opts.offset ?? 0,
    userId: opts.userId,
    at: Date.now(),
    session: getSession(),
  });
}

export function trackRecoClick(opts: {
  productId: string;
  reason: string;
  position: number;
  offset?: number;
  userId?: string;
}) {
  push({
    type: "click",
    productId: opts.productId,
    reason: opts.reason,
    position: opts.position,
    offset: opts.offset ?? 0,
    userId: opts.userId,
    at: Date.now(),
    session: getSession(),
  });
}

export function getRecoEvents(): RecoEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecoEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearRecoEvents() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
