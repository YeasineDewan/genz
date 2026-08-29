import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import { addStockAlert, removeStockAlertFor, useStockAlerts, useUser } from "@/lib/store";

export function BackInStockButton({
  productId,
  size,
  color,
}: {
  productId: string;
  size?: string;
  color?: string;
}) {
  const alerts = useStockAlerts();
  const user = useUser();
  const active = alerts.some((a) => a.productId === productId && a.size === size && a.color === color);

  return (
    <button
      type="button"
      onClick={() => {
        if (active) {
          removeStockAlertFor(productId, size, color);
          toast("Alert removed");
          return;
        }
        addStockAlert({ productId, size, color, email: user?.email });
        toast.success("We'll ping you when it's back", {
          description: [size, color].filter(Boolean).join(" · ") || undefined,
        });
      }}
      className={`chip ${active ? "bg-ink text-paper" : "bg-pop-yellow"}`}
    >
      {active ? <BellOff size={14}/> : <BellRing size={14}/>}
      {active ? "Alert on" : "Notify me when back"}
    </button>
  );
}
