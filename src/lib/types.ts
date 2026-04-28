export type Category = string;

export interface CategoryDef {
  id: string;
  slug: string;
  name: string;
  emoji?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;          // primary / cover
  images?: string[];      // gallery (includes primary at index 0)
  category: Category;
  colors: string[];
  sizes: string[];
  description: string;
  badge?: string;
  stock: number;
}

export interface CartItem {
  productId: string;
  size: string;
  color: string;
  qty: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

export interface TrackingEvent {
  status: OrderStatus;
  at: number;
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  shipping: { name: string; address: string; city: string; zip: string; country: string };
  tracking?: TrackingEvent[];
  trackingNumber?: string;
  carrier?: string;
}

export type FunnelEventType = "checkout_started" | "order_completed";
export interface FunnelEvent {
  type: FunnelEventType;
  at: number;
}

export type StockChangeSource = "manual" | "order" | "cancellation" | "product_create" | "product_edit";
export interface StockAuditEntry {
  id: string;
  productId: string;
  productName: string;
  before: number;
  after: number;
  delta: number;
  source: StockChangeSource;
  note?: string;
  at: number;
  actor?: string;
}
