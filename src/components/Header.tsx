import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, User as UserIcon, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.jpg";
import { useCart, useUser, signOut, cartCount } from "@/lib/store";

export function Header({ onCartClick }: { onCartClick: () => void }) {
  const cart = useCart();
  const user = useUser();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);

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

        <form
          className="ml-auto flex-1 max-w-md hidden sm:flex items-center gap-2 rounded-full border-[3px] border-ink bg-white px-3 py-2 shadow-sticker-sm"
          onSubmit={(e) => { e.preventDefault(); navigate({ to: "/shop", search: { q } as any }); }}
        >
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the chaos..." className="w-full bg-transparent outline-none text-sm" />
        </form>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMenu((v) => !v)}
              className="h-11 w-11 rounded-full border-[3px] border-ink bg-pop-cyan grid place-items-center shadow-sticker-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition"
              aria-label="Account"
            >
              <UserIcon size={18} />
            </button>
            {menu && (
              <div onMouseLeave={() => setMenu(false)} className="absolute right-0 mt-2 w-56 sticker rounded-xl p-2 z-50">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-sm">
                      <div className="font-bold">{user.name}</div>
                      <div className="text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <Link to="/account" className="block px-3 py-2 rounded-lg hover:bg-pop-yellow font-semibold text-sm">My orders</Link>
                    {user.isAdmin && (
                      <Link to="/admin" className="px-3 py-2 rounded-lg hover:bg-pop-yellow font-semibold text-sm flex items-center gap-2">
                        <ShieldCheck size={14} /> Admin
                      </Link>
                    )}
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
            onClick={onCartClick}
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
    </header>
  );
}
