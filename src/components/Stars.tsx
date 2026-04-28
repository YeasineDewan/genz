import { Star } from "lucide-react";

export function Stars({
  value,
  size = 16,
  onChange,
  count,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
  count?: number;
}) {
  const interactive = !!onChange;
  return (
    <div className="inline-flex items-center gap-1" aria-label={`Rated ${value.toFixed(1)} of 5`}>
      <div className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.round(value);
          const Btn = interactive ? "button" : "span";
          return (
            <Btn
              key={i}
              type="button"
              onClick={interactive ? () => onChange?.(i) : undefined}
              className={interactive ? "px-0.5 hover:scale-110 transition" : "px-0.5"}
              aria-label={interactive ? `Rate ${i}` : undefined}
            >
              <Star
                size={size}
                className={filled ? "fill-pop-yellow text-ink" : "text-ink/30"}
                strokeWidth={2}
              />
            </Btn>
          );
        })}
      </div>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground ml-1">
          {count > 0 ? `${value.toFixed(1)} (${count})` : "No reviews"}
        </span>
      )}
    </div>
  );
}
