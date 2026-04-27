import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.jpg";

export function Footer() {
  return (
    <footer className="mt-24 border-t-[3px] border-ink bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-14 grid gap-10 md:grid-cols-4">
        <div>
          <img src={logo} alt="GenZ" width={64} height={64} className="rounded-xl border-[3px] border-paper" />
          <p className="mt-4 text-sm opacity-80">Loud streetwear for the chronically online. Made for misfits, drops every Friday.</p>
        </div>
        <div>
          <h4 className="text-pop-yellow text-xl mb-3">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop" className="hover:text-pop-pink">All</Link></li>
            <li><Link to="/shop" search={{ category: "tops" } as any} className="hover:text-pop-pink">Tops</Link></li>
            <li><Link to="/shop" search={{ category: "shoes" } as any} className="hover:text-pop-pink">Shoes</Link></li>
            <li><Link to="/shop" search={{ category: "accessories" } as any} className="hover:text-pop-pink">Accessories</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-pop-cyan text-xl mb-3">Help</h4>
          <ul className="space-y-2 text-sm opacity-90">
            <li>Shipping & returns</li><li>Size guide</li><li>Contact</li>
          </ul>
        </div>
        <div>
          <h4 className="text-pop-pink text-xl mb-3">Get the drop</h4>
          <p className="text-sm opacity-80 mb-3">First dibs on every release.</p>
          <form className="flex gap-2">
            <input className="flex-1 rounded-full px-4 py-2 text-ink" placeholder="you@email.com" />
            <button type="button" className="btn-pop yellow">Join</button>
          </form>
        </div>
      </div>
      <div className="border-t border-paper/20 py-4 text-center text-xs opacity-60">© {new Date().getFullYear()} GenZ — All rights reserved.</div>
    </footer>
  );
}
