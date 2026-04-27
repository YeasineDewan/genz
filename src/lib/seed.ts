import type { Product } from "./types";
import p1 from "@/assets/p1.jpg";
import p2 from "@/assets/p2.jpg";
import p3 from "@/assets/p3.jpg";
import p4 from "@/assets/p4.jpg";
import p5 from "@/assets/p5.jpg";
import p6 from "@/assets/p6.jpg";
import p7 from "@/assets/p7.jpg";
import p8 from "@/assets/p8.jpg";

export const seedProducts: Product[] = [
  { id: "1", slug: "pop-blast-hoodie", name: "Pop Blast Hoodie", price: 79, image: p1, category: "tops", colors: ["pink","black"], sizes: ["S","M","L","XL"], description: "Oversized fleece hoodie with a chunky pop-art print. Built for loud days.", badge: "HOT", stock: 24 },
  { id: "2", slug: "colorblock-cargos", name: "Colorblock Cargos", price: 95, image: p2, category: "bottoms", colors: ["orange","cyan"], sizes: ["S","M","L","XL"], description: "Two-tone baggy cargos with deep pockets. Yes, your phone fits.", stock: 14 },
  { id: "3", slug: "chunky-runner-99", name: "Chunky Runner '99", price: 140, image: p3, category: "shoes", colors: ["yellow","pink"], sizes: ["38","39","40","41","42","43"], description: "Y2K-coded chunky sneakers. Cushion clouds, neon stitching.", badge: "NEW", stock: 9 },
  { id: "4", slug: "splash-tee", name: "Splash Tee", price: 39, image: p4, category: "tops", colors: ["white"], sizes: ["S","M","L","XL"], description: "Heavyweight cotton tee with hand-painted style splash graphic.", stock: 60 },
  { id: "5", slug: "neon-mini-bag", name: "Neon Mini Bag", price: 55, image: p5, category: "accessories", colors: ["orange"], sizes: ["OS"], description: "Tiny crossbody, big chain energy. Holds the essentials.", stock: 30 },
  { id: "6", slug: "bubblegum-bucket", name: "Bubblegum Bucket Hat", price: 28, image: p6, category: "accessories", colors: ["pink"], sizes: ["OS"], description: "Soft cotton bucket hat. Pure bubblegum vibes.", stock: 45 },
  { id: "7", slug: "candy-shades", name: "Candy Shades", price: 32, image: p7, category: "accessories", colors: ["pink"], sizes: ["OS"], description: "Translucent pink frames with rose gradient lenses.", badge: "★", stock: 22 },
  { id: "8", slug: "patch-denim-jacket", name: "Patch Denim Jacket", price: 165, image: p8, category: "tops", colors: ["cyan"], sizes: ["S","M","L","XL"], description: "Vintage-wash denim jacket loaded with chaotic-good patches.", stock: 7 },
];
