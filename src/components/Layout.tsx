import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SupportChatHead } from "./SupportChatHead";
import { CompareBar } from "./CompareBar";
import { useEnsureSeeded } from "@/lib/store";

export const OPEN_CART_EVENT = "genz:open-cart";

export function openCartDrawer() {
  window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT));
}

export function Layout({ children }: { children: React.ReactNode }) {
  useEnsureSeeded();
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener(OPEN_CART_EVENT, open);
    return () => window.removeEventListener(OPEN_CART_EVENT, open);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <SupportChatHead />
      <CompareBar />

    </div>
  );
}
