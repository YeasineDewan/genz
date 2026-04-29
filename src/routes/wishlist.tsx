import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, useWishlist, useUser, addToCart } from "@/lib/store";
import { useMemo, useState } from "react";
import { Heart, Share2, Copy, Check, ShoppingBag, X, Twitter, Facebook, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — GenZ" },
      { name: "description", content: "Your saved products on GenZ Streetwear." },
    ],
  }),
  component: Wishlist,
});

function Wishlist() {
  const wish = useWishlist();
  const products = useProducts();
  const user = useUser();
  const [shareOpen, setShareOpen] = useState(false);
  const items = useMemo(
    () => wish.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p),
    [wish, products],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams();
    params.set("ids", items.map((p) => p.id).join(","));
    if (user?.name) params.set("by", user.name);
    return `${window.location.origin}/wishlist/share?${params.toString()}`;
  }, [items, user]);

  const addAll = () => {
    let n = 0;
    items.forEach((p) => {
      if (p.stock > 0) {
        addToCart({ productId: p.id, size: p.sizes[0], color: p.colors[0], qty: 1 });
        n++;
      }
    });
    toast.success(n > 0 ? `Added ${n} to your bag` : "All items sold out");
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
            <p className="text-muted-foreground mt-1">{items.length} saved item{items.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {items.length > 0 && (
              <>
                <button onClick={addAll} className="btn-pop ghost"><ShoppingBag size={16}/> Add all</button>
                <button onClick={nativeShare} className="btn-pop"><Share2 size={16}/> Share</button>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((p, i) => <ProductCard key={p.id} product={p} index={i}/>)}
          </div>
        )}
      </section>

      {shareOpen && <ShareModal url={shareUrl} onClose={() => setShareOpen(false)}/>}
    </Layout>
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
