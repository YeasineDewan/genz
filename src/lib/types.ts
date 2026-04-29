export type Category = string;

export interface CategoryDef {
  id: string;
  slug: string;
  name: string;
  emoji?: string;
}

export interface VariantStock {
  size: string;
  color: string;
  stock: number;
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
  stock: number;          // total fallback stock (sum of variants when variants exist)
  variants?: VariantStock[]; // optional per-size/color inventory
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
  subtotal?: number;
  shippingFee?: number;
  discount?: number;
  couponCode?: string;
  status: OrderStatus;
  createdAt: number;
  shipping: { name: string; address: string; city: string; zip: string; country: string };
  tracking?: TrackingEvent[];
  trackingNumber?: string;
  carrier?: string;
}

export type FunnelEventType = "cart_viewed" | "checkout_started" | "order_completed";
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

export type ReviewStatus = "pending" | "approved" | "hidden";
export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  body: string;
  at: number;
  status?: ReviewStatus; // default approved (back-compat)
  reports?: number;
}

export type CouponType = "percent" | "fixed";
export interface Coupon {
  id: string;
  code: string;        // uppercase
  type: CouponType;
  value: number;       // % or $ amount
  minSubtotal?: number;
  maxUses?: number;
  uses: number;
  active: boolean;
  expiresAt?: number;
}
