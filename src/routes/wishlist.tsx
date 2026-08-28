import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, openCartDrawer } from "@/components/Layout";
import {
  useProducts, useWishlist, useUser, addToCart, toggleWishlist,
  formatPrice, getVariantStock, sizeHasStock, colorHasStock,
} from "@/lib/store";
import type { Product } from "@/lib/types";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Share2, Copy, Check, ShoppingBag, X, Twitter, Facebook, MessageCircle, Trash2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Saved Streetwear Picks | GenZ" },
      { name: "description", content: "View your saved products, pick sizes and colors, check live availability, and move favorites straight into your bag." },
      { property: "og:title", content: "Wishlist — Saved Streetwear Picks | GenZ" },
      { property: "og:description", content: "Your saved GenZ picks with live stock and one-tap add to bag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Wishlist,
});

function removeWithUndo(product: Product) {
  toggleWishlist(product.id);
  toast(`Removed ${product.name} from wishlist`, {
    duration: 5000,
    action: {
      label: "Undo",
      onClick: () => {
        toggleWishlist(product.id);
        toast.success(`${product.name} restored`);
      },
    },
  });
}

function Wishlist() {
  const wish = useWishlist();
  const products = useProducts();
  const user = useUser();
  const [shareOpen, setShareOpen] = useState(false);

  const items = useMemo(
    () => wish.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [wish, products],
  );

  const totalValue = items.reduce((s, p) => s + p.price, 0);
  const inStockCount = items.filter((p) => p.stock > 0).length;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    params.set("ids", items.map((p) => p.id).join(","));
    if (user?.name) params.set("by", user.name);
    params.set("t", String(Date.now()));
    return `${window.location.origin}/wishlist/share?${params.toString()}`;
  }, [items, user]);

  const addAll = () => {
    let n = 0;
    items.forEach((p) => {
      const size = p.sizes.find((s) => sizeHasStock(p, s));
      const color = p.colors.find((c) => colorHasStock(p, c));
      if (size && color && getVariantStock(p, size, color) > 0) {
        addToCart({ productId: p.id, size, color, qty: 1 });
        n++;
      }
    });
    if (n > 0) {
      toast.success(`Added ${n} item${n === 1 ? "" : "s"} to your bag`);
      openCartDrawer();
    } else {
      toast.error("No available variants to add");
    }
  };

  const clearAll = () => {
    items.forEach((p) => toggleWishlist(p.id));
    toast.success("Wishlist cleared");
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My GenZ Wishlist", text: "Check out my picks 👀", url: shareUrl });
      } catch { /* dismissed */ }
    } else {
      setShareOpen(true);
    }
  };

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <h1 className="text-5xl flex items-center gap-3">
              <Heart className="fill-pop-pink text-pop-pink" size={40}/> Wishlist
            </h1>
            <p className="text-muted-foreground mt-1">
              {items.length} saved item{items.length === 1 ? "" : "s"}
              {items.length > 0 && <> · {inStockCount} in stock · {formatPrice(totalValue)} total</>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {items.length > 0 && (
              <>
                <button onClick={addAll} className="btn-pop ghost"><ShoppingBag size={16}/> Add all available</button>
                <button onClick={nativeShare} className="btn-pop"><Share2 size={16}/> Share</button>
                <button onClick={clearAll} className="btn-pop ghost"><Trash2 size={16}/> Clear</button>
              </>
            )}
            <Link to="/shop" className="btn-pop ghost">Keep shopping</Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="sticker rounded-2xl bg-white p-12 text-center">
            <div className="text-6xl mb-3">💖</div>
            <p className="font-bold mb-4">No favorites yet — tap the heart on any product.</p>
            <Link to="/shop" className="btn-pop">Discover drops</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence initial={false}>
              {items.map((p, i) => (
                <WishlistRow key={p.id} product={p} index={i}/>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {shareOpen && <ShareModal url={shareUrl} onClose={() => setShareOpen(false)}/>}
    </Layout>
  );
}

function WishlistRow({ product, index }: { product: Product; index: number }) {
  const firstSize = product.sizes.find((s) => sizeHasStock(product, s)) ?? product.sizes[0] ?? "";
  const firstColor = product.colors.find((c) => colorHasStock(product, c)) ?? product.colors[0] ?? "";
  const [size, setSize] = useState(firstSize);
  const [color, setColor] = useState(firstColor);
  const [qty, setQty] = useState(1);

  const stock = getVariantStock(product, size, color);
  const soldOut = stock <= 0;
  const maxQty = Math.max(1, Math.min(stock, 10));

  const add = () => {
    if (soldOut) return;
    addToCart({ productId: product.id, size, color, qty: Math.min(qty, stock) });
    toast.success(`${product.name} added to your bag`, { description: `${size} · ${color} · ×${Math.min(qty, stock)}` });
    openCartDrawer();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.03 }}
      className="sticker rounded-2xl bg-white p-4 grid gap-4 md:grid-cols-[120px_1fr_auto]"
    >
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
        <img src={product.image} alt={product.name} width={240} height={240} loading="lazy"
             className="h-28 w-28 md:h-30 md:w-30 rounded-xl border-[3px] border-ink object-cover bg-pop-cyan"/>
      </Link>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to="/product/$slug" params={{ slug: product.slug }} className="font-bold text-lg hover:underline truncate block">
              {product.name}
            </Link>
            <div className="text-xs uppercase text-muted-foreground">{product.category}</div>
          </div>
          <div className="font-display text-2xl shrink-0">{formatPrice(product.price)}</div>
        </div>

        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] uppercase font-bold mb-1">Size</div>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((s) => {
                const ok = sizeHasStock(product, s);
                return (
                  <button key={s} type="button" disabled={!ok} onClick={() => setSize(s)}
                    className={`chip text-xs ${size === s ? "bg-ink text-paper" : ""} ${ok ? "" : "opacity-40 line-through cursor-not-allowed"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold mb-1">Color</div>
            <div className="flex flex-wrap gap-1.5">
              {product.colors.map((c) => {
                const ok = colorHasStock(product, c) && getVariantStock(product, size, c) > 0;
                return (
                  <button key={c} type="button" disabled={!colorHasStock(product, c)} onClick={() => setColor(c)}
                    className={`chip text-xs ${color === c ? "bg-ink text-paper" : ""} ${ok ? "" : "opacity-40 line-through cursor-not-allowed"}`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs font-bold">
          {soldOut ? (
            <span className="chip bg-destructive text-white">Sold out in this combo</span>
          ) : stock <= 5 ? (
            <span className="chip bg-pop-orange">Only {stock} left</span>
          ) : (
            <span className="chip bg-pop-cyan">In stock</span>
          )}
        </div>
      </div>

      <div className="flex md:flex-col items-center md:items-end gap-2 justify-between">
        <div className="flex items-center border-2 border-ink rounded-full">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-2 py-1" aria-label="Decrease quantity"><Minus size={12}/></button>
          <span className="px-2 font-bold text-sm">{Math.min(qty, maxQty)}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="px-2 py-1" aria-label="Increase quantity"><Plus size={12}/></button>
        </div>
        <button type="button" onClick={add} disabled={soldOut} className={`btn-pop whitespace-nowrap ${soldOut ? "opacity-50 cursor-not-allowed" : ""}`}>
          <ShoppingBag size={16}/> Add to bag
        </button>
        <button
          type="button"
          onClick={() => removeWithUndo(product)}
          className="chip text-xs hover:bg-destructive hover:text-white transition"
        >
          <Trash2 size={12}/> Remove
        </button>
      </div>
    </motion.div>
  );
}

function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    });
  };
  const text = encodeURIComponent("Check out my GenZ wishlist 👀");
  const u = encodeURIComponent(url);
  const social = [
    { name: "Twitter", Icon: Twitter, href: `https://twitter.com/intent/tweet?text=${text}&url=${u}`, bg: "bg-pop-cyan" },
    { name: "Facebook", Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, bg: "bg-pop-yellow" },
    { name: "WhatsApp", Icon: MessageCircle, href: `https://wa.me/?text=${text}%20${u}`, bg: "bg-pop-pink", fg: "text-white" },
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sticker rounded-2xl bg-white max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl">Share wishlist</h3>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full border-2 border-ink"><X size={16}/></button>
        </div>
        <div className="flex items-center gap-2 border-[3px] border-ink rounded-xl bg-paper p-2">
          <input readOnly value={url} className="flex-1 bg-transparent outline-none text-sm font-mono truncate"/>
          <button onClick={copy} className="btn-pop text-sm py-1.5 px-3">
            {copied ? <Check size={14}/> : <Copy size={14}/>}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5">
          {social.map((s) => (
            <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer"
              className={`sticker-sm rounded-xl ${s.bg} ${s.fg ?? ""} p-3 flex flex-col items-center gap-1 text-xs font-bold hover:translate-y-[-2px] transition`}>
              <s.Icon size={20}/>{s.name}
            </a>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">Anyone with the link can view your saved items.</p>
      </div>
    </div>
  );
}
