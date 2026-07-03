import { useState } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";
import { SupportChatHead } from "./SupportChatHead";
import { useEnsureSeeded } from "@/lib/store";

export function Layout({ children }: { children: React.ReactNode }) {
  useEnsureSeeded();
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <SupportChatHead />
    </div>
  );
}
