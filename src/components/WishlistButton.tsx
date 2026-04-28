import { Heart } from "lucide-react";
import { useWishlist, toggleWishlist } from "@/lib/store";
import { toast } from "sonner";

export function WishlistButton({
  productId,
  className = "",
  size = 18,
}: {
  productId: string;
  className?: string;
  size?: number;
}) {
  const wish = useWishlist();
  const active = wish.includes(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const added = toggleWishlist(productId);
        toast.success(added ? "Added to wishlist" : "Removed from wishlist");
      }}
      className={`grid place-items-center h-9 w-9 rounded-full border-[3px] border-ink bg-white shadow-sticker-sm hover:translate-y-[-2px] transition ${className}`}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
    >
      <Heart
        size={size}
        className={active ? "fill-pop-pink text-pop-pink" : "text-ink"}
        strokeWidth={2.5}
      />
    </button>
  );
}
