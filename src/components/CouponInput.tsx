import { useState } from "react";
import { Tag, X, Check } from "lucide-react";
import { validateCoupon, useAppliedCoupon, setAppliedCoupon, useUser } from "@/lib/store";
import { toast } from "sonner";

export function CouponInput({ subtotal }: { subtotal: number }) {
  const applied = useAppliedCoupon();
  const user = useUser();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);

  const result = applied ? validateCoupon(applied, subtotal, { userId: user?.id }) : null;
  const isValid = result?.ok;

  const apply = () => {
    if (!code.trim()) return;
    const r = validateCoupon(code, subtotal, { userId: user?.id });
    if (!r.ok) { toast.error(r.reason); return; }
    setAppliedCoupon(r.coupon.code);
    setCode(""); setOpen(false);
    toast.success(`Code ${r.coupon.code} applied — you saved $${r.discount.toFixed(2)}`);
  };

  const remove = () => {
    setAppliedCoupon(null);
    toast.success("Coupon removed");
  };

  if (applied && isValid) {
    return (
      <div className="border-[3px] border-ink rounded-xl bg-pop-cyan/40 p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Check size={16} className="shrink-0"/>
          <div className="min-w-0">
            <div className="font-bold font-mono text-sm truncate">{applied}</div>
            <div className="text-xs">−${result.discount.toFixed(2)} off</div>
          </div>
        </div>
        <button onClick={remove} className="h-7 w-7 grid place-items-center rounded-full border-2 border-ink bg-white hover:bg-destructive hover:text-white transition" aria-label="Remove">
          <X size={14}/>
        </button>
      </div>
    );
  }

  if (applied && !isValid) {
    return (
      <div className="border-[3px] border-ink rounded-xl bg-destructive/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold">Code {applied}: {result?.ok === false ? result.reason : "invalid"}</span>
          <button onClick={remove} className="chip text-xs">Remove</button>
        </div>
      </div>
    );
  }

  return open ? (
    <div className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
        placeholder="Enter code"
        autoFocus
        className="flex-1 rounded-xl border-[3px] border-ink bg-white px-3 py-2 outline-none font-mono uppercase tracking-wider text-sm"
      />
      <button onClick={apply} className="btn-pop text-sm">Apply</button>
      <button onClick={() => { setOpen(false); setCode(""); }} className="chip">Cancel</button>
    </div>
  ) : (
    <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-ink rounded-xl py-2.5 text-sm font-bold hover:bg-pop-yellow/30 transition">
      <Tag size={14}/> Have a promo code?
    </button>
  );
}
