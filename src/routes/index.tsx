import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/store";
import { motion } from "framer-motion";
import { Sparkles, Zap, Truck, Heart, Flame, Star, ArrowRight, Quote, Instagram } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { useMemo, useState, useEffect } from "react";

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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function CountdownStrip() {
  // Drop on next Friday midnight
  const target = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const add = ((5 - day + 7) % 7) || 7;
    d.setDate(d.getDate() + add);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = now === null ? 0 : Math.max(0, target - now);

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);

  const Cell = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center">
      <div className="font-display text-3xl md:text-4xl tabular-nums leading-none bg-white border-[3px] border-ink rounded-xl px-3 py-2 shadow-sticker-sm">
        {v.toString().padStart(2, "0")}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest mt-1">{l}</div>
    </div>
  );
  return (
    <div className="flex items-center gap-3 md:gap-4">
      <Cell v={d} l="days" />
      <Cell v={h} l="hours" />
      <Cell v={m} l="mins" />
      <Cell v={s} l="secs" />
    </div>
  );
}

function Index() {
  const products = useProducts();
  const featured = products.slice(0, 4);
  const trending = products.slice(4, 8);
  const newest = products.slice(-4).reverse();
  const bestRated = products.slice(2, 6);

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
            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="mt-4 text-5xl sm:text-6xl md:text-7xl"
            >
              <span className="block">DRESS LOUD.</span>
              <span className="block text-pop-pink">LIVE LOUDER.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="mt-5 max-w-md text-lg"
            >
              Streetwear cut for the chronically online. Pop-art prints, chunky soles, zero chill.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="mt-7 flex flex-wrap gap-3"
            >
              <Link to="/shop" className="btn-pop">Shop the drop</Link>
              <Link to="/shop" search={{ category: "shoes" } as any} className="btn-pop cyan">See sneakers</Link>
            </motion.div>
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
            <motion.div
              animate={{ rotate: [-12, -8, -12], y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -top-4 -right-4 sticker rounded-full bg-pop-yellow w-28 h-28 grid place-items-center text-center font-display text-xl leading-none p-2"
            >
              SAVE<br/>20%
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* COUNTDOWN BAR */}
      <section className="border-b-[3px] border-ink bg-pop-cyan">
        <div className="mx-auto max-w-7xl px-4 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold">
            <Flame className="text-pop-pink" /> Next drop goes live in
          </div>
          <CountdownStrip />
          <Link to="/shop" className="btn-pop text-sm">Set reminder <ArrowRight size={14}/></Link>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-4xl">Pick your poison.</h2>
          <Link to="/shop" className="text-sm font-bold underline underline-offset-4">View all →</Link>
        </div>
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: "Tops", category: "tops", bg: "bg-pop-pink", emoji: "👕" },
            { label: "Bottoms", category: "bottoms", bg: "bg-pop-cyan", emoji: "👖" },
            { label: "Shoes", category: "shoes", bg: "bg-pop-yellow", emoji: "👟" },
            { label: "Accessories", category: "accessories", bg: "bg-pop-orange", emoji: "🕶️" },
          ].map((c) => (
            <motion.div key={c.label} variants={fadeUp}>
              <Link to="/shop" search={{ category: c.category } as any}
                className={`sticker rounded-2xl p-6 ${c.bg} hover:translate-y-[-3px] transition flex flex-col items-center justify-center aspect-square group`}>
                <div className="text-5xl mb-2 group-hover:scale-110 transition-transform">{c.emoji}</div>
                <div className="font-display text-2xl">{c.label}</div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-4xl flex items-center gap-3"><Sparkles className="text-pop-pink"/> Hot right now</h2>
          <Link to="/shop" className="text-sm font-bold underline underline-offset-4">Shop all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* PROMO SPLIT */}
      <section className="mx-auto max-w-7xl px-4 py-12 grid md:grid-cols-2 gap-6">
        <motion.div
          whileHover={{ y: -4 }}
          className="sticker rounded-3xl bg-pop-pink text-white p-8 md:p-10 relative overflow-hidden"
        >
          <span className="chip bg-white text-ink">LIMITED</span>
          <h3 className="font-display text-4xl mt-3">Members-only drop</h3>
          <p className="mt-2 max-w-sm">Sign up & get 10% off your first order + early access to the next drop.</p>
          <Link to="/signup" className="btn-pop mt-5 inline-flex bg-white text-ink">Join GenZ</Link>
          <div className="absolute -bottom-6 -right-6 text-[10rem] opacity-20 leading-none">★</div>
        </motion.div>
        <motion.div
          whileHover={{ y: -4 }}
          className="sticker rounded-3xl bg-pop-yellow p-8 md:p-10 relative overflow-hidden"
        >
          <span className="chip bg-ink text-white">FREE</span>
          <h3 className="font-display text-4xl mt-3">Shipping over $80</h3>
          <p className="mt-2 max-w-sm">Stack the bag. Save the dollars. We'll get it to your door fast.</p>
          <Link to="/shop" className="btn-pop mt-5 inline-flex">Start shopping</Link>
          <div className="absolute -bottom-6 -right-6 text-[10rem] opacity-20 leading-none">🚚</div>
        </motion.div>
      </section>

      {/* TRENDING */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-4xl flex items-center gap-3"><Flame className="text-pop-orange"/> Trending now</h2>
          <Link to="/shop" className="text-sm font-bold underline underline-offset-4">Shop all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trending.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* JUST DROPPED */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-4xl flex items-center gap-3"><Sparkles className="text-pop-cyan"/> Just dropped</h2>
          <Link to="/shop" className="text-sm font-bold underline underline-offset-4">Shop all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {newest.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* BIG STATEMENT */}
      <section className="mt-12 border-y-[3px] border-ink bg-pop-pink overflow-hidden">
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

      {/* TOP RATED */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-4xl flex items-center gap-3"><Star className="text-pop-yellow fill-pop-yellow"/> Top rated</h2>
          <Link to="/shop" className="text-sm font-bold underline underline-offset-4">Shop all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {bestRated.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-4xl mb-8">Loved by the loud ones.</h2>
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            { name: "Maya R.", text: "The hoodie is THICK. I get compliments daily.", color: "bg-pop-yellow", emoji: "🔥" },
            { name: "Devon K.", text: "Sneakers fit like a glove. Shipping was crazy fast.", color: "bg-pop-cyan", emoji: "⚡" },
            { name: "Lulu V.", text: "Finally a brand that gets it. Loud, fun, fits great.", color: "bg-pop-pink text-white", emoji: "💖" },
          ].map((t) => (
            <motion.div key={t.name} variants={fadeUp} className={`sticker rounded-2xl p-6 ${t.color}`}>
              <Quote size={28} className="mb-2 opacity-60"/>
              <p className="font-bold text-lg">"{t.text}"</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-sm">— {t.name}</span>
                <span className="text-2xl">{t.emoji}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* INSTA STRIP */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-4xl flex items-center gap-3"><Instagram /> @genz.shop</h2>
          <span className="text-sm font-bold text-muted-foreground">Tag us to be featured</span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {products.slice(0, 6).map((p) => (
            <motion.a
              key={p.id}
              whileHover={{ scale: 1.04, rotate: -1 }}
              href="#"
              className="aspect-square rounded-xl overflow-hidden border-[3px] border-ink shadow-sticker-sm"
            >
              <img src={p.image} alt={p.name} className="w-full h-full object-cover"/>
            </motion.a>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="sticker rounded-3xl bg-ink text-paper p-10 md:p-14 text-center relative overflow-hidden"
        >
          <h3 className="font-display text-4xl md:text-5xl">Get on the list.</h3>
          <p className="mt-3 max-w-md mx-auto opacity-80">First to know about drops, restocks, and members-only deals.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); (e.currentTarget as HTMLFormElement).reset(); }}
            className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email" required placeholder="you@youremail.com"
              className="flex-1 rounded-xl border-[3px] border-paper bg-transparent px-4 py-3 outline-none placeholder:text-paper/50"
            />
            <button className="btn-pop">Subscribe</button>
          </form>
          <p className="text-[11px] opacity-60 mt-3">No spam. Unsubscribe whenever.</p>
        </motion.div>
      </section>
    </Layout>
  );
}
