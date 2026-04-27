import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

interface Props {
  images: string[];
  alt: string;
}

export function ProductGallery({ images, alt }: Props) {
  const list = images.length > 0 ? images : [];
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (active >= list.length) setActive(0);
  }, [list.length, active]);

  const prev = () => setActive((a) => (a - 1 + list.length) % list.length);
  const next = () => setActive((a) => (a + 1) % list.length);

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed, list.length]);

  if (list.length === 0) return null;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative sticker-lg rounded-3xl overflow-hidden bg-pop-yellow group"
      >
        <div
          className="relative aspect-square cursor-zoom-in overflow-hidden"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={() => setZoomed(true)}
        >
          <img
            src={list[active]}
            alt={alt}
            className="w-full h-full object-cover mix-blend-multiply transition-transform duration-200"
            style={hover ? { transform: `scale(1.6)`, transformOrigin: `${hover.x}% ${hover.y}%` } : undefined}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
            className="absolute top-3 right-3 h-10 w-10 rounded-full border-[3px] border-ink bg-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
            aria-label="Open zoom view"
          >
            <ZoomIn size={16}/>
          </button>
        </div>

        {list.length > 1 && (
          <>
            <button type="button" onClick={(e)=>{e.stopPropagation();prev();}}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border-[3px] border-ink bg-white grid place-items-center opacity-0 group-hover:opacity-100 transition" aria-label="Previous">
              <ChevronLeft size={18}/>
            </button>
            <button type="button" onClick={(e)=>{e.stopPropagation();next();}}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border-[3px] border-ink bg-white grid place-items-center opacity-0 group-hover:opacity-100 transition" aria-label="Next">
              <ChevronRight size={18}/>
            </button>
          </>
        )}
      </motion.div>

      {list.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {list.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 rounded-xl overflow-hidden border-[3px] ${i === active ? "border-pop-pink ring-2 ring-pop-pink ring-offset-2 ring-offset-paper" : "border-ink"} bg-white`}
              aria-label={`View image ${i + 1}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover"/>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-ink/90 grid place-items-center p-4"
            onClick={() => setZoomed(false)}
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="absolute top-4 right-4 h-11 w-11 rounded-full border-[3px] border-ink bg-white grid place-items-center"
              aria-label="Close"
            >
              <X size={18}/>
            </button>
            {list.length > 1 && (
              <>
                <button type="button" onClick={(e)=>{e.stopPropagation();prev();}}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-[3px] border-ink bg-white grid place-items-center" aria-label="Previous">
                  <ChevronLeft size={20}/>
                </button>
                <button type="button" onClick={(e)=>{e.stopPropagation();next();}}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-[3px] border-ink bg-white grid place-items-center" aria-label="Next">
                  <ChevronRight size={20}/>
                </button>
              </>
            )}
            <motion.img
              key={active}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              src={list[active]}
              alt={alt}
              className="max-h-[90vh] max-w-[92vw] object-contain rounded-2xl border-[3px] border-white"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 chip bg-white">
              {active + 1} / {list.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
