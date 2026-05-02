import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, addToCart } from "@/lib/store";
import { useMemo } from "react";
import { Heart, ShoppingBag, Share2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const ID_RE = /^[a-zA-Z0-9_-]{4,64}$/;

const searchSchema = z.object({
  ids: z.string().optional(),
  by: z.string().max(40).optional(),
  t: z.coerce.number().optional(), // optional timestamp token (expiry)
});

export const Route = createFileRoute("/wishlist_/share")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shared wishlist — GenZ" },
      { name: "description", content: "Someone shared their GenZ wishlist with you." },
    ],
  }),
  component: SharedWishlist,
});

const SHARE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

type Diagnosis =
  | { kind: "ok" }
  | { kind: "missing" }
  | { kind: "malformed" }
  | { kind: "expired" }
  | { kind: "all_unknown"; total: number }
  | { kind: "partial"; missing: number; total: number };

function SharedWishlist() {
  const { ids, by, t } = Route.useSearch();
  const products = useProducts();

  const { items, diagnosis } = useMemo(() => {
    if (!ids || !ids.trim()) {
      return { items: [], diagnosis: { kind: "missing" } as Diagnosis };
    }
    const raw = ids.split(",").map((s) => s.trim()).filter(Boolean);
    const valid = raw.filter((id) => ID_RE.test(id));
    if (raw.length === 0 || valid.length === 0) {
      return { items: [], diagnosis: { kind: "malformed" } as Diagnosis };
    }
    if (t && Date.now() - t > SHARE_TTL_MS) {
      return { items: [], diagnosis: { kind: "expired" } as Diagnosis };
    }
    const found = valid
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    if (found.length === 0) {
      return { items: [], diagnosis: { kind: "all_unknown", total: valid.length } as Diagnosis };
    }
    if (found.length < valid.length) {
      return { items: found, diagnosis: { kind: "partial", missing: valid.length - found.length, total: valid.length } as Diagnosis };
    }
    return { items: found, diagnosis: { kind: "ok" } as Diagnosis };
  }, [ids, t, products]);

  const addAll = () => {
    let n = 0;
    items.forEach((p) => {
      if (p.stock > 0) {
        addToCart({ productId: p.id, size: p.sizes[0], color: p.colors[0], qty: 1 });
        n++;
      }
    });
    toast.success(n > 0 ? `Added ${n} item${n === 1 ? "" : "s"} to your bag` : "All items sold out");
  };

  const empty = items.length === 0;

  const errorMessage = (() => {
    switch (diagnosis.kind) {
      case "missing":
        return { title: "No wishlist token", body: "This share link is missing items. Ask the sender for a fresh link.", emoji: "🔗" };
      case "malformed":
        return { title: "Invalid share link", body: "We couldn't read this link. It may be broken or tampered with.", emoji: "⚠️" };
      case "expired":
        return { title: "This wishlist has expired", body: "Share links are valid for 30 days. Ask the sender to share a new one.", emoji: "⏰" };
      case "all_unknown":
        return { title: "Wishlist no longer exists", body: `None of the ${diagnosis.total} item${diagnosis.total === 1 ? "" : "s"} in this wishlist are available anymore.`, emoji: "🗑️" };
      default:
        return null;
    }
  })();

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="sticker rounded-2xl bg-pop-pink text-white p-6 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <Share2 size={28}/>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase font-bold opacity-80">Shared wishlist</div>
              <h1 className="text-3xl md:text-4xl">{by ? `${by}'s picks` : "A wishlist for you"}</h1>
              <p className="text-sm mt-1 opacity-90">
                {empty ? "We couldn't load this wishlist." : `${items.length} item${items.length === 1 ? "" : "s"} curated for you.`}
              </p>
            </div>
            {!empty && (
              <button onClick={addAll} className="btn-pop bg-white text-ink">
                <ShoppingBag size={16}/> Add all to bag
              </button>
            )}
          </div>
        </div>

        {empty && errorMessage ? (
          <div className="sticker rounded-2xl bg-white p-12 text-center max-w-xl mx-auto">
            <div className="text-6xl mb-3">{errorMessage.emoji}</div>
            <h2 className="text-2xl mb-2">{errorMessage.title}</h2>
            <p className="text-sm text-muted-foreground mb-6">{errorMessage.body}</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link to="/shop" className="btn-pop">Discover the shop</Link>
              <Link to="/wishlist" className="btn-pop ghost"><Heart size={14}/> Build your own</Link>
            </div>
          </div>
        ) : (
          <>
            {diagnosis.kind === "partial" && (
              <div className="sticker rounded-2xl bg-pop-yellow p-3 mb-4 flex items-center gap-2 text-sm">
                <AlertTriangle size={16}/>
                <span><span className="font-bold">{diagnosis.missing}</span> of {diagnosis.total} items in this wishlist are no longer available.</span>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((p, i) => <ProductCard key={p.id} product={p} index={i}/>)}
            </div>
          </>
        )}

        <div className="mt-10 text-center">
          <Link to="/wishlist" className="btn-pop ghost"><Heart size={16}/> Build your own</Link>
        </div>
      </section>
    </Layout>
  );
}
