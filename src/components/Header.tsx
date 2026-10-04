import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, User as UserIcon, LogOut, Heart, Command } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.jpg";
import { useCart, useUser, signOut, cartCount, useWishlist } from "@/lib/store";
import { CommandPalette } from "@/components/CommandPalette";

export function Header({ onCartClick }: { onCartClick: () => void }) {
  const cart = useCart();
  const user = useUser();
  const wish = useWishlist();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Cmd+K / Ctrl+K → open palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-paper/95 backdrop-blur">
      <div className="bg-ink text-paper text-xs">
        <div className="overflow-hidden whitespace-nowrap">
          <div className="marquee-track inline-block">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="inline-flex gap-8 px-4 py-2 font-bold uppercase tracking-widest">
                <span>★ Free shipping over $80</span><span>•</span>
                <span>New drop: Pop Blast Collection</span><span>•</span>
                <span>Student discount —10% with code GENZ10</span><span>•</span>
                <span>Loud, proud, sold out fast</span><span>•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="GenZ" width={48} height={48} className="rounded-xl border-[3px] border-ink shadow-sticker-sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          {[
            { to: "/", label: "Home" },
            { to: "/shop", label: "Shop" },
            { to: "/shop", label: "Tops", search: { category: "tops" } as any },
            { to: "/shop", label: "Shoes", search: { category: "shoes" } as any },
            { to: "/shop", label: "Accessories", search: { category: "accessories" } as any },
          ].map((l, i) => (
            <Link
              key={i}
              to={l.to}
              search={l.search}
              className="px-3 py-2 rounded-full font-bold text-sm hover:bg-pop-yellow border-2 border-transparent hover:border-ink transition"
              activeOptions={{ exact: true }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex-1 max-w-md hidden sm:flex items-center gap-2 rounded-full border-[3px] border-ink bg-white px-3 py-2 shadow-sticker-sm text-left"
        >
          <Search size={18} />
          <span className="flex-1 text-sm text-muted-foreground">Search the chaos...</span>
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase border border-ink/30 rounded px-1.5 py-0.5 text-muted-foreground">
            <Command size={10}/> K
          </span>
        </button>

        {/* Mobile mini search submit (kept for accessibility) */}
        <form className="sr-only" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/shop", search: { q } as any }); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search"/>
        </form>

        <div className="flex items-center gap-2">
          <Link to="/wishlist" className="relative h-11 w-11 rounded-full border-[3px] border-ink bg-white grid place-items-center shadow-sticker-sm hover:translate-y-[-2px] transition" aria-label="Wishlist">
            <Heart size={18} className={wish.length > 0 ? "fill-pop-pink text-pop-pink" : ""}/>
            {wish.length > 0 && (
              <span className="absolute -top-1 -right-1 grid place-items-center min-w-5 h-5 px-1 rounded-full bg-ink text-paper text-[10px] font-bold">{wish.length}</span>
            )}
          </Link>

          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              className="h-11 w-11 rounded-full border-[3px] border-ink bg-pop-cyan grid place-items-center shadow-sticker-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition"
              aria-label="Account"
            >
              <UserIcon size={18} />
            </button>
            {menu && (
              <div onMouseLeave={() => setMenu(false)} className="absolute right-0 mt-2 w-56 sticker rounded-xl p-2 z-50 bg-white">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-sm">
                      <div className="font-bold">{user.name}</div>
                      <div className="text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <Link to="/account" className="block px-3 py-2 rounded-lg hover:bg-pop-yellow font-semibold text-sm">My account</Link>
                    <Link to="/account" className="block px-3 py-2 rounded-lg hover:bg-pop-yellow font-semibold text-sm">My orders</Link>
                    <Link to="/wishlist" className="block px-3 py-2 rounded-lg hover:bg-pop-yellow font-semibold text-sm">Wishlist</Link>
                    <button onClick={() => { signOut(); setMenu(false); navigate({ to: "/" }); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-pop-pink hover:text-white font-semibold text-sm flex items-center gap-2">
                      <LogOut size={14} /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-3 py-2 rounded-lg hover:bg-pop-yellow font-semibold text-sm">Sign in</Link>
                    <Link to="/signup" className="block px-3 py-2 rounded-lg hover:bg-pop-yellow font-semibold text-sm">Create account</Link>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onCartClick} aria-label="Open cart"
            className="relative h-11 px-4 rounded-full border-[3px] border-ink bg-pop-pink text-white font-bold shadow-sticker-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition flex items-center gap-2"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            <span className="ml-1 grid place-items-center min-w-6 h-6 px-1 rounded-full bg-ink text-paper text-xs">
              {cartCount(cart)}
            </span>
          </button>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)}/>
    </header>
  );
}
