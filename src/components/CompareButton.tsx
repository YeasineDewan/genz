import { GitCompare } from "lucide-react";
import { toast } from "sonner";
import { COMPARE_MAX, toggleCompare, useCompare } from "@/lib/store";

export function CompareButton({ productId, label = false }: { productId: string; label?: boolean }) {
  const list = useCompare();
  const active = list.includes(productId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const res = toggleCompare(productId);
    if (res.full) toast.error(`Compare holds ${COMPARE_MAX} items — remove one first`);
    else if (res.added) toast.success("Added to compare");
    else toast("Removed from compare");
  };

  if (label) {
    return (
      <button type="button" onClick={onClick} className={`chip ${active ? "bg-ink text-paper" : ""}`}>
        <GitCompare size={14}/> {active ? "In compare" : "Compare"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? "Remove from compare" : "Add to compare"}
      aria-pressed={active}
      className={`grid place-items-center h-9 w-9 rounded-full border-[3px] border-ink shadow-sticker-sm hover:translate-y-[-2px] transition ${active ? "bg-ink text-paper" : "bg-white"}`}
    >
      <GitCompare size={16}/>
    </button>
  );
}
