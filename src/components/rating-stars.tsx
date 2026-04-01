import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (val: number) => void;
}

const sizeMap = {
  sm: "w-3.5 h-3.5",
  md: "w-5 h-5",
  lg: "w-7 h-7",
};

export default function RatingStars({ rating, size = "md", interactive = false, onChange }: RatingStarsProps) {
  const iconSize = sizeMap[size];

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={`transition-all duration-200 ${
              interactive ? "cursor-pointer hover:scale-125 active:scale-95" : "cursor-default"
            } ${
              filled
                ? "text-warning drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                : "text-text-dim/30"
            }`}
          >
            <Star className={iconSize} fill={filled ? "currentColor" : "none"} strokeWidth={filled ? 0 : 1.5} />
          </button>
        );
      })}
    </div>
  );
}
