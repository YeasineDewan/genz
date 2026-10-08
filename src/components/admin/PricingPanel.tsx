import { useEffect, useMemo, useState } from "react";
import { useProducts, saveProduct, formatPrice } from "@/lib/store";
import type { Product, VariantStock } from "@/lib/types";
import { toast } from "sonner";

function buildGrid(p: Product): VariantStock[] {
  const each = Math.floor(p.stock / Math.max(1, p.sizes.length * p.colors.length));
  return p.sizes.flatMap((size) => p.colors.map((color) => {
    const v = p.variants?.find((x) => x.size === size && x.color === color);
    return { size, color, stock: v?.stock ?? (p.variants?.length ? 0 : each), price: v?.price, active: v?.active ?? true };
  }));
}

export function PricingPanel() {
  const products = useProducts();
  const [id, setId] = useState(products[0]?.id ?? "");
  const [q, setQ] = useState("");
  const product = products.find((p) => p.id === id);
  const [rows, setRows] = useState<VariantStock[]>([]);
  const [base, setBase] = useState(0);
  useEffect(() => { if (product) { setRows(buildGrid(product)); setBase(product.price); } }, [product?.id]);

  const list = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), [products, q]);

  const commit = (next: VariantStock[], nextBase = base) => {
    if (!product) return;
    setRows(next);
    const total = next.filter((v) => v.active !== false).reduce((s, v) => s + Math.max(0, v.stock), 0);
    saveProduct({ ...product, price: nextBase, variants: next, stock: total });
  };
  const patch = (i: number, p: Partial<VariantStock>) => commit(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const bulk = (p: Partial<VariantStock>) => { commit(rows.map((r) => ({ ...r, ...p }))); toast.success("Applied to all variants"); };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4">
      <aside className="sticker rounded-2xl bg-white p-3 space-y-2 h-fit">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products"
          className="w-full rounded-lg border-2 border-ink/20 px-3 py-2 text-sm"/>
        <div className="max-h-[520px] overflow-auto space-y-1">
          {list.map((p) => (
            <button key={p.id} onClick={() => setId(p.id)}
              className={`w-full flex items-center gap-2 rounded-lg p-2 text-left text-sm ${p.id === id ? "bg-pop-yellow font-bold" : "hover:bg-muted"}`}>
              <img src={p.image} alt="" className="h-8 w-8 rounded object-cover border border-ink"/>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs">{p.stock}</span>
            </button>
          ))}
        </div>
      </aside>
      {product ? (
        <section className="sticker rounded-2xl bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div>
              <h3 className="text-2xl">{product.name}</h3>
              <p className="text-xs text-muted-foreground">Changes save instantly and update the shop and filters.</p>
            </div>
            <label className="text-sm font-bold">Base price
              <input type="number" min={0} step="0.01" value={base}
                onChange={(e) => { const v = Number(e.target.value); setBase(v); commit(rows, v); }}
                className="ml-2 w-28 rounded-lg border-2 border-ink px-2 py-1"/>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button className="chip" onClick={() => bulk({ active: true })}>Enable all</button>
            <button className="chip" onClick={() => bulk({ active: false })}>Disable all</button>
            <button className="chip" onClick={() => bulk({ price: undefined })}>Reset prices to base</button>
            <button className="chip" onClick={() => { const n = Number(prompt("Set stock for every variant:", "10")); if (!Number.isNaN(n)) bulk({ stock: Math.max(0, n) }); }}>Set all stock…</button>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b-2 border-ink">
                <th className="py-2">Size</th><th>Color</th><th>Price</th><th>Stock</th><th>Available</th><th>Status</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const price = r.price ?? base;
                  return (
                    <tr key={`${r.size}-${r.color}`} className={`border-b border-ink/10 ${r.active === false ? "opacity-50" : ""}`}>
                      <td className="py-2 font-bold">{r.size}</td>
                      <td>{r.color}</td>
                      <td><input type="number" min={0} step="0.01" aria-label={`Price ${r.size} ${r.color}`}
                        value={r.price ?? ""} placeholder={String(base)}
                        onChange={(e) => patch(i, { price: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className="w-24 rounded-lg border-2 border-ink/30 px-2 py-1"/></td>
                      <td><input type="number" min={0} aria-label={`Stock ${r.size} ${r.color}`} value={r.stock}
                        onChange={(e) => patch(i, { stock: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-20 rounded-lg border-2 border-ink/30 px-2 py-1"/></td>
                      <td><input type="checkbox" aria-label={`Available ${r.size} ${r.color}`} checked={r.active !== false}
                        onChange={(e) => patch(i, { active: e.target.checked })} className="h-4 w-4"/></td>
                      <td><span className={`chip text-xs ${r.active === false ? "" : r.stock === 0 ? "bg-pop-orange" : "bg-pop-cyan"}`}>
                        {r.active === false ? "Hidden" : r.stock === 0 ? "Sold out" : r.stock <= 5 ? `Low · ${formatPrice(price)}` : formatPrice(price)}
                      </span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : <p className="text-muted-foreground">No products.</p>}
    </div>
  );
}
