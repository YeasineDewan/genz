import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { CouponInput } from "@/components/CouponInput";
import {
  useCart, useProducts, useUser, cartTotal, clearCart, placeOrder, formatPrice,
  trackFunnel, useAppliedCoupon, validateCoupon, setAppliedCoupon,
} from "@/lib/store";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2, Truck, Zap, MapPin, Mail, Phone, User, Building2, Gift, MessageSquare, CreditCard, ShieldCheck, Lock, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — GenZ" }] }),
  component: Checkout,
});

const phoneRe = /^[+\d][\d\s().-]{6,}$/;
const zipRe = /^[A-Za-z0-9 \-]{3,12}$/;

const contactSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z.string().trim().regex(phoneRe, "Enter a valid phone number").max(30),
});
const shippingSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().min(4, "Address is required").max(140),
  address2: z.string().trim().max(140).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(60),
  state: z.string().trim().max(60).optional().or(z.literal("")),
  zip: z.string().trim().regex(zipRe, "Invalid ZIP / postal code"),
  country: z.string().trim().min(2, "Country is required").max(60),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  giftMessage: z.string().trim().max(200).optional().or(z.literal("")),
});

type Delivery = "standard" | "express" | "pickup";
const DELIVERY: { id: Delivery; label: string; eta: string; price: (sub: number) => number; Icon: typeof Truck }[] = [
  { id: "standard", label: "Standard", eta: "5–7 business days", price: (s) => (s >= 80 ? 0 : 8), Icon: Truck },
  { id: "express", label: "Express", eta: "2–3 business days", price: () => 18, Icon: Zap },
  { id: "pickup", label: "Store pickup", eta: "Ready in 24h", price: () => 0, Icon: MapPin },
];

function Checkout() {
  const cart = useCart();
  const products = useProducts();
  const user = useUser();
  const navigate = useNavigate();
  const subtotal = cartTotal(cart, products);
  const applied = useAppliedCoupon();
  const couponResult = applied ? validateCoupon(applied, subtotal) : null;
  const discount = couponResult?.ok ? couponResult.discount : 0;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [delivery, setDelivery] = useState<Delivery>("standard");
  const [contact, setContact] = useState({ email: user?.email ?? "", phone: user?.phone ?? "" });
  const [ship, setShip] = useState({
    name: user?.name ?? "", company: "", address: "", address2: "",
    city: "", state: "", zip: "", country: "USA",
    notes: "", giftMessage: "",
  });
  const [card, setCard] = useState({ number: "", exp: "", cvc: "", name: "" });
  const [agree, setAgree] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const shippingFee = useMemo(() => {
    const def = DELIVERY.find((d) => d.id === delivery)!;
    return def.price(subtotal);
  }, [delivery, subtotal]);
  const tax = useMemo(() => Math.round(Math.max(0, subtotal - discount) * 0.08 * 100) / 100, [subtotal, discount]);
  const grand = Math.max(0, subtotal - discount + shippingFee + tax);

  useEffect(() => { if (cart.length > 0) trackFunnel("checkout_started"); }, [cart.length]);

  if (cart.length === 0) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-24 px-4">
          <h1 className="text-4xl">Nothing to check out.</h1>
          <Link to="/shop" className="btn-pop mt-6 inline-flex">Go shop</Link>
        </div>
      </Layout>
    );
  }

  const validate = (next: 1 | 2 | 3) => {
    const errs: Record<string, string> = {};
    if (next >= 2) {
      const r = contactSchema.safeParse(contact);
      if (!r.success) r.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
    }
    if (next >= 3) {
      const r = shippingSchema.safeParse(ship);
      if (!r.success) r.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goto = (s: 1 | 2 | 3) => {
    if (s > step && !validate(s as 2 | 3)) { toast.error("Please fix the highlighted fields"); return; }
    setStep(s);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(3)) { toast.error("Please complete required fields"); setStep(errors.email || errors.phone ? 1 : 2); return; }
    if (!card.number.trim() || !card.exp.trim() || !card.cvc.trim()) { toast.error("Enter payment details"); return; }
    if (!agree) { toast.error("Please accept the terms to continue"); return; }
    setLoading(true);
    setTimeout(() => {
      const order = placeOrder({
        userId: user?.id ?? "guest",
        items: cart,
        subtotal,
        shippingFee,
        discount,
        couponCode: discount > 0 && couponResult?.ok ? couponResult.coupon.code : undefined,
        total: grand,
        shipping: {
          name: ship.name.trim(),
          email: contact.email.trim(),
          phone: contact.phone.trim(),
          company: ship.company.trim() || undefined,
          address: ship.address.trim(),
          address2: ship.address2.trim() || undefined,
          city: ship.city.trim(),
          state: ship.state.trim() || undefined,
          zip: ship.zip.trim(),
          country: ship.country.trim(),
          notes: ship.notes.trim() || undefined,
          giftMessage: ship.giftMessage.trim() || undefined,
          deliveryMethod: delivery,
        },
      });
      clearCart();
      setAppliedCoupon(null);
      setLoading(false);
      toast.success("Order placed! 🎉");
      navigate({ to: "/order/$id", params: { id: order.id } });
    }, 900);
  };

  const Field = ({ id, label, required, error, icon: Icon, ...props }: any) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wide flex items-center gap-2">
        {Icon && <Icon size={12}/>}{label}{required && <span className="text-pop-pink">*</span>}
      </label>
      <input id={id} {...props}
        className={`w-full rounded-xl border-[3px] bg-white px-4 py-3 outline-none focus:bg-pop-yellow/30 transition ${error ? "border-destructive" : "border-ink"}`}/>
      {error && <p className="text-xs text-destructive font-bold">{error}</p>}
    </div>
  );

  const Steps = () => (
    <div className="flex items-center gap-2 mb-6">
      {[
        { n: 1, label: "Contact" },
        { n: 2, label: "Shipping" },
        { n: 3, label: "Payment" },
      ].map((s, i) => (
        <div key={s.n} className="flex items-center gap-2 flex-1">
          <button type="button" onClick={() => s.n < step && setStep(s.n as 1 | 2 | 3)}
            className={`flex items-center gap-2 ${s.n <= step ? "" : "opacity-50"}`}>
            <span className={`h-8 w-8 grid place-items-center rounded-full border-[3px] border-ink font-bold text-sm ${step > s.n ? "bg-pop-pink text-white" : step === s.n ? "bg-pop-yellow" : "bg-white"}`}>
              {step > s.n ? <CheckCircle2 size={16}/> : s.n}
            </span>
            <span className="hidden sm:inline text-sm font-bold">{s.label}</span>
          </button>
          {i < 2 && <div className={`flex-1 h-1 rounded-full ${step > s.n ? "bg-pop-pink" : "bg-ink/15"}`}/>}
        </div>
      ))}
    </div>
  );

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-5xl">Checkout</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Lock size={12}/> Secure checkout · {cart.reduce((n, i) => n + i.qty, 0)} items
            </p>
          </div>
          <Link to="/cart" className="chip"><ChevronLeft size={12}/> Back to cart</Link>
        </div>

        <form onSubmit={submit} className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <Steps/>

            {/* Step 1 — Contact */}
            {step === 1 && (
              <div className="sticker rounded-2xl bg-white p-6 space-y-4 animate-in fade-in">
                <h3 className="text-2xl">Contact</h3>
                <p className="text-sm text-muted-foreground -mt-2">We'll send your order confirmation here.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field id="email" label="Email" required icon={Mail} type="email" autoComplete="email"
                    value={contact.email} onChange={(e: any)=>setContact({...contact, email: e.target.value})} error={errors.email}/>
                  <Field id="phone" label="Phone" required icon={Phone} type="tel" autoComplete="tel"
                    value={contact.phone} onChange={(e: any)=>setContact({...contact, phone: e.target.value})} error={errors.phone}/>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="button" onClick={()=>goto(2)} className="btn-pop">Continue to shipping</button>
                </div>
              </div>
            )}

            {/* Step 2 — Shipping */}
            {step === 2 && (
              <>
                <div className="sticker rounded-2xl bg-white p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl">Shipping address</h3>
                    <button type="button" onClick={()=>setStep(1)} className="chip"><ChevronLeft size={12}/> Edit contact</button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field id="name" label="Full name" required icon={User} autoComplete="name"
                      value={ship.name} onChange={(e: any)=>setShip({...ship, name: e.target.value})} error={errors.name}/>
                    <Field id="company" label="Company" icon={Building2} autoComplete="organization"
                      value={ship.company} onChange={(e: any)=>setShip({...ship, company: e.target.value})}/>
                  </div>
                  <Field id="address" label="Street address" required icon={MapPin} autoComplete="address-line1"
                    value={ship.address} onChange={(e: any)=>setShip({...ship, address: e.target.value})} error={errors.address}/>
                  <Field id="address2" label="Apt / Suite" autoComplete="address-line2"
                    value={ship.address2} onChange={(e: any)=>setShip({...ship, address2: e.target.value})}/>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <Field id="city" label="City" required autoComplete="address-level2"
                      value={ship.city} onChange={(e: any)=>setShip({...ship, city: e.target.value})} error={errors.city}/>
                    <Field id="state" label="State / Region" autoComplete="address-level1"
                      value={ship.state} onChange={(e: any)=>setShip({...ship, state: e.target.value})}/>
                    <Field id="zip" label="ZIP / Postal" required autoComplete="postal-code"
                      value={ship.zip} onChange={(e: any)=>setShip({...ship, zip: e.target.value})} error={errors.zip}/>
                  </div>
                  <Field id="country" label="Country" required autoComplete="country-name"
                    value={ship.country} onChange={(e: any)=>setShip({...ship, country: e.target.value})} error={errors.country}/>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><MessageSquare size={12}/> Order notes</label>
                      <textarea value={ship.notes} onChange={(e)=>setShip({...ship, notes: e.target.value})}
                        rows={3} maxLength={400} placeholder="Delivery instructions (optional)"
                        className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 outline-none focus:bg-pop-yellow/30 resize-none"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2"><Gift size={12}/> Gift message</label>
                      <textarea value={ship.giftMessage} onChange={(e)=>setShip({...ship, giftMessage: e.target.value})}
                        rows={3} maxLength={200} placeholder="Add a personal note (optional)"
                        className="w-full rounded-xl border-[3px] border-ink bg-white px-4 py-3 outline-none focus:bg-pop-yellow/30 resize-none"/>
                    </div>
                  </div>
                </div>

                <div className="sticker rounded-2xl bg-white p-6 space-y-3">
                  <h3 className="text-2xl">Delivery method</h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {DELIVERY.map((d) => {
                      const fee = d.price(subtotal);
                      const active = delivery === d.id;
                      return (
                        <button key={d.id} type="button" onClick={()=>setDelivery(d.id)}
                          className={`text-left rounded-xl border-[3px] border-ink p-4 transition ${active ? "bg-pop-pink text-white -translate-y-0.5" : "bg-white hover:bg-pop-yellow/30"}`}>
                          <div className="flex items-center justify-between"><d.Icon size={18}/><span className="font-bold">{fee === 0 ? "FREE" : formatPrice(fee)}</span></div>
                          <div className="font-bold mt-2">{d.label}</div>
                          <div className={`text-xs ${active ? "text-white/80" : "text-muted-foreground"}`}>{d.eta}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={()=>setStep(1)} className="btn-pop ghost"><ChevronLeft size={16}/> Back</button>
                  <button type="button" onClick={()=>goto(3)} className="btn-pop">Continue to payment</button>
                </div>
              </>
            )}

            {/* Step 3 — Payment */}
            {step === 3 && (
              <>
                <div className="sticker rounded-2xl bg-pop-cyan p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl flex items-center gap-2"><CreditCard size={22}/> Payment</h3>
                    <span className="chip bg-white"><ShieldCheck size={12}/> Encrypted</span>
                  </div>
                  <Field id="cardname" label="Name on card" required autoComplete="cc-name"
                    value={card.name} onChange={(e: any)=>setCard({...card, name: e.target.value})}/>
                  <Field id="cardnum" label="Card number" required inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456"
                    value={card.number} onChange={(e: any)=>setCard({...card, number: e.target.value})}/>
                  <div className="grid grid-cols-2 gap-4">
                    <Field id="exp" label="Expiry" required placeholder="MM/YY" autoComplete="cc-exp"
                      value={card.exp} onChange={(e: any)=>setCard({...card, exp: e.target.value})}/>
                    <Field id="cvc" label="CVC" required inputMode="numeric" autoComplete="cc-csc" placeholder="123"
                      value={card.cvc} onChange={(e: any)=>setCard({...card, cvc: e.target.value})}/>
                  </div>
                  <p className="text-xs">Demo only — no real charge will be made.</p>
                </div>

                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-pop-pink"/>
                  <span>I agree to the <Link to="/" className="underline font-bold">Terms</Link> and <Link to="/" className="underline font-bold">Privacy Policy</Link>, and confirm my shipping details are correct.</span>
                </label>

                <div className="flex justify-between">
                  <button type="button" onClick={()=>setStep(2)} className="btn-pop ghost"><ChevronLeft size={16}/> Back</button>
                  <button disabled={loading} type="submit" className="btn-pop disabled:opacity-60">
                    {loading ? "Processing..." : `Pay ${formatPrice(grand)}`}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Order summary */}
          <aside className="sticker rounded-2xl bg-pop-yellow p-6 h-fit space-y-3 lg:sticky lg:top-32">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl">Order summary</h3>
              <span className="chip bg-white">{cart.length} item{cart.length === 1 ? "" : "s"}</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-auto pr-1">
              {cart.map((it, i) => {
                const p = products.find((x) => x.id === it.productId);
                if (!p) return null;
                return (
                  <div key={i} className="flex gap-2 text-sm">
                    <div className="relative">
                      <img src={p.image} className="h-14 w-14 rounded-lg border-2 border-ink object-cover" alt=""/>
                      <span className="absolute -top-2 -right-2 h-5 min-w-5 px-1 grid place-items-center rounded-full bg-ink text-white text-[10px] font-bold">{it.qty}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-xs">{it.size} · {it.color}</div>
                    </div>
                    <div className="font-bold">{formatPrice(p.price * it.qty)}</div>
                  </div>
                );
              })}
            </div>
            <CouponInput subtotal={subtotal}/>
            <div className="border-t-2 border-ink pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-pop-pink font-bold">
                  <span>Discount ({applied})</span><span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between"><span>Shipping</span><span>{shippingFee ? formatPrice(shippingFee) : "FREE"}</span></div>
              <div className="flex justify-between"><span>Tax (est.)</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between font-display text-2xl pt-2 border-t-2 border-ink mt-2"><span>Total</span><span>{formatPrice(grand)}</span></div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 text-xs">
              <span className="chip bg-white"><ShieldCheck size={12}/> SSL secured</span>
              <span className="chip bg-white"><Truck size={12}/> Free returns</span>
            </div>
          </aside>
        </form>
      </section>
    </Layout>
  );
}
