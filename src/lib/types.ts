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

export interface Address {
  id: string;
  label?: string;        // "Home", "Work"
  name: string;
  phone?: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  isDefault?: boolean;
}

export interface UserPreferences {
  newsletter: boolean;
  orderUpdates: boolean;
  promos: boolean;
  smsAlerts: boolean;
  currency?: string;
  language?: string;
  theme?: "light" | "dark" | "system";
}

export interface Notification {
  id: string;
  title: string;
  body?: string;
  at: number;
  read?: boolean;
  href?: string;
  kind?: "order" | "promo" | "system" | "review";
}

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  phone?: string;
  avatar?: string;       // data URL or http URL
  bio?: string;
  birthday?: string;     // ISO yyyy-mm-dd
  createdAt?: number;
  addresses?: Address[];
  preferences?: UserPreferences;
  notifications?: Notification[];
  loyaltyPoints?: number;
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
  shipping: {
    name: string;
    email?: string;
    phone: string;
    address: string;
    address2?: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
    company?: string;
    notes?: string;
    deliveryMethod?: "standard" | "express" | "pickup";
    giftMessage?: string;
  };
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
export type ReportReason = "spam" | "offensive" | "off_topic" | "fake" | "misleading" | "other";
export interface ReviewReport {
  reason: ReportReason;
  note?: string;
  at: number;
  userId?: string;
}
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
  reportLog?: ReviewReport[];
  editedAt?: number;
}

export const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: "spam", label: "Spam", description: "Promotional or repeated content" },
  { value: "offensive", label: "Offensive", description: "Hate speech, harassment, or abuse" },
  { value: "off_topic", label: "Off-topic", description: "Not about this product" },
  { value: "fake", label: "Fake review", description: "Suspected paid or fake review" },
  { value: "misleading", label: "Misleading", description: "Inaccurate or false claims" },
  { value: "other", label: "Other", description: "Something else needs attention" },
];

export type CouponType = "percent" | "fixed";
export interface CouponRedemption {
  at: number;
  orderId: string;
  userId?: string;
  discount: number;
  subtotal: number;
}
export interface Coupon {
  id: string;
  code: string;        // uppercase
  type: CouponType;
  value: number;       // % or $ amount
  minSubtotal?: number;
  maxUses?: number;
  maxPerUser?: number;     // limit redemptions per user
  startsAt?: number;       // not redeemable before
  expiresAt?: number;
  firstOrderOnly?: boolean; // only redeemable on a user's first order
  active: boolean;
  uses: number;
  redemptions?: CouponRedemption[]; // history of usage
  createdAt?: number;
  description?: string;
}
