import { useState } from "react";

interface RatingStarsProps {
  value: number;
  onChange?: (score: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-3xl" };

export default function RatingStars({ value, onChange, size = "md", readonly = false }: RatingStarsProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${sizes[size]} transition-colors ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${(hover || value) >= star ? "text-warning" : "text-text-muted/30"}`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
