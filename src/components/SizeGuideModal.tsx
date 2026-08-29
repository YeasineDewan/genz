import { motion, AnimatePresence } from "framer-motion";
import { X, Ruler } from "lucide-react";
import { useState } from "react";

type Unit = "cm" | "in";

const TOPS = [
  { size: "XS", chest: 88, length: 64, sleeve: 58 },
  { size: "S", chest: 94, length: 67, sleeve: 60 },
  { size: "M", chest: 100, length: 70, sleeve: 62 },
  { size: "L", chest: 108, length: 73, sleeve: 64 },
  { size: "XL", chest: 116, length: 75, sleeve: 66 },
  { size: "XXL", chest: 124, length: 77, sleeve: 68 },
];

const BOTTOMS = [
  { size: "XS", waist: 68, hip: 90, inseam: 74 },
  { size: "S", waist: 74, hip: 96, inseam: 76 },
  { size: "M", waist: 80, hip: 102, inseam: 78 },
  { size: "L", waist: 88, hip: 110, inseam: 80 },
  { size: "XL", waist: 96, hip: 118, inseam: 81 },
  { size: "XXL", waist: 104, hip: 126, inseam: 82 },
];

const SHOES = [
  { size: "38", eu: 38, us: 6, foot: 24 },
  { size: "39", eu: 39, us: 6.5, foot: 24.6 },
  { size: "40", eu: 40, us: 7, foot: 25.2 },
  { size: "41", eu: 41, us: 8, foot: 25.9 },
  { size: "42", eu: 42, us: 8.5, foot: 26.5 },
  { size: "43", eu: 43, us: 9.5, foot: 27.2 },
  { size: "44", eu: 44, us: 10, foot: 27.9 },
];

export function SizeGuideModal({
  open,
  onClose,
  category = "tops",
}: {
  open: boolean;
  onClose: () => void;
  category?: string;
}) {
  const [unit, setUnit] = useState<Unit>("cm");
  const kind = category === "shoes" ? "shoes" : category === "bottoms" ? "bottoms" : "tops";
  const conv = (v: number) => (unit === "cm" ? v : Math.round((v / 2.54) * 10) / 10);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-ink/60 backdrop-blur-sm grid place-items-center p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Size guide"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl sticker rounded-2xl bg-white overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 p-4 border-b-[3px] border-ink">
              <h3 className="text-2xl flex items-center gap-2"><Ruler size={18}/> Size guide</h3>
              <div className="flex items-center gap-2">
                <div className="flex rounded-full border-[3px] border-ink overflow-hidden text-xs font-bold">
                  {(["cm", "in"] as Unit[]).map((u) => (
                    <button key={u} onClick={() => setUnit(u)}
                      className={`px-3 py-1 uppercase ${unit === u ? "bg-ink text-paper" : "bg-white"}`}>{u}</button>
                  ))}
                </div>
                <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full border-2 border-ink bg-white" aria-label="Close">
                  <X size={14}/>
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left uppercase text-[11px] tracking-wide">
                    <th className="py-2">Size</th>
                    {kind === "tops" && <><th>Chest</th><th>Length</th><th>Sleeve</th></>}
                    {kind === "bottoms" && <><th>Waist</th><th>Hip</th><th>Inseam</th></>}
                    {kind === "shoes" && <><th>EU</th><th>US</th><th>Foot</th></>}
                  </tr>
                </thead>
                <tbody>
                  {kind === "tops" && TOPS.map((r) => (
                    <tr key={r.size} className="border-t-2 border-ink/10">
                      <td className="py-2 font-bold">{r.size}</td>
                      <td>{conv(r.chest)}</td><td>{conv(r.length)}</td><td>{conv(r.sleeve)}</td>
                    </tr>
                  ))}
                  {kind === "bottoms" && BOTTOMS.map((r) => (
                    <tr key={r.size} className="border-t-2 border-ink/10">
                      <td className="py-2 font-bold">{r.size}</td>
                      <td>{conv(r.waist)}</td><td>{conv(r.hip)}</td><td>{conv(r.inseam)}</td>
                    </tr>
                  ))}
                  {kind === "shoes" && SHOES.map((r) => (
                    <tr key={r.size} className="border-t-2 border-ink/10">
                      <td className="py-2 font-bold">{r.size}</td>
                      <td>{r.eu}</td><td>{r.us}</td><td>{conv(r.foot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-5 grid sm:grid-cols-2 gap-3 text-xs">
                <div className="sticker-sm rounded-xl p-3 bg-pop-yellow/40">
                  <div className="font-bold mb-1">How to measure</div>
                  Measure over light clothing, keep the tape flat and snug — never tight.
                </div>
                <div className="sticker-sm rounded-xl p-3 bg-pop-cyan/40">
                  <div className="font-bold mb-1">Between sizes?</div>
                  Our fits run boxy. Size down for a clean fit, stay true for street.
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
