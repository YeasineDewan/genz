export type Category = "tops" | "bottoms" | "shoes" | "accessories";

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
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

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: "pending" | "shipped" | "delivered";
  createdAt: number;
  shipping: { name: string; address: string; city: string; zip: string; country: string };
}
