import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/store";
import { motion } from "framer-motion";
import { Sparkles, Zap, Truck, Heart } from "lucide-react";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GenZ — Loud Streetwear for the Chronically Online" },
      { name: "description", content: "Pop-art streetwear, hoodies, sneakers and accessories. New drop every Friday." },
      { property: "og:title", content: "GenZ — Loud Streetwear" },
      { property: "og:description", content: "Pop-art streetwear, hoodies, sneakers and accessories." },
    ],
  }),
  component: Index,
});

function Index() {
  const products = useProducts();
  const featured = products.slice(0, 4);

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b-[3px] border-ink">
        <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-pop-yellow blur-2xl opacity-60" />
        <div className="absolute -bottom-20 right-10 w-96 h-96 rounded-full bg-pop-cyan blur-3xl opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <motion.span initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: -4 }} transition={{ type: "spring", stiffness: 220 }}
              className="inline-block chip bg-pop-pink text-white">★ NEW DROP — VOL. 04</motion.span>
            <h1 className="mt-4 text-5xl sm:text-6xl md:text-7xl">
              <span className="block">DRESS LOUD.</span>
              <span className="block text-pop-pink">LIVE LOUDER.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg">
              Streetwear cut for the chronically online. Pop-art prints, chunky soles, zero chill.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-pop">Shop the drop</Link>
              <Link to="/shop" search={{ category: "shoes" } as any} className="btn-pop cyan">See sneakers</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <span className="chip"><Truck size={12}/> Free ship over $80</span>
              <span className="chip"><Zap size={12}/> 48h dispatch</span>
              <span className="chip"><Heart size={12}/> 14-day returns</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95, rotate: 4 }} animate={{ opacity: 1, scale: 1, rotate: 2 }}
            transition={{ duration: 0.6 }} className="relative">
            <div className="sticker-lg rounded-3xl overflow-hidden bg-white wobble">
              <img src={hero} alt="GenZ streetwear hero" width={1600} height={1200} className="w-full h-auto" />
            </div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }}
              className="absolute -top-4 -right-4 sticker rounded-full bg-pop-yellow w-28 h-28 grid place-items-center -rotate-12 text-center font-display text-xl leading-none p-2">
              SAVE<br/>20%
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-4xl">Pick your poison.</h2>
          <Link to="/shop" className="text-sm font-bold underline underline-offset-4">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Tops", category: "tops", bg: "bg-pop-pink", emoji: "👕" },
            { label: "Bottoms", category: "bottoms", bg: "bg-pop-cyan", emoji: "👖" },
            { label: "Shoes", category: "shoes", bg: "bg-pop-yellow", emoji: "👟" },
            { label: "Accessories", category: "accessories", bg: "bg-pop-orange", emoji: "🕶️" },
          ].map((c) => (
            <Link key={c.label} to="/shop" search={{ category: c.category } as any}
              className={`sticker rounded-2xl p-6 ${c.bg} hover:translate-y-[-3px] transition flex flex-col items-center justify-center aspect-square`}>
              <div className="text-5xl mb-2">{c.emoji}</div>
              <div className="font-display text-2xl">{c.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-4xl mb-6 flex items-center gap-3"><Sparkles className="text-pop-pink"/> Hot right now</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* BIG STATEMENT */}
      <section className="mt-20 border-y-[3px] border-ink bg-pop-pink overflow-hidden">
        <div className="py-8 whitespace-nowrap">
          <div className="marquee-track inline-block">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="text-paper text-7xl font-display inline-flex items-center gap-10 px-6">
                MADE FOR MISFITS ★ DRESS LOUD ★ LIVE LOUDER ★ NEW DROP FRIDAYS ★
              </span>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
