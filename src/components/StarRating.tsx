import React from 'react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  className?: string;
  showValue?: boolean;
}

export default function StarRating({ 
  rating, 
  maxStars = 5, 
  size = 14, 
  className = "",
  showValue = false
}: StarRatingProps) {
  const roundedRating = Math.round(rating);

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[...Array(maxStars)].map((_, i) => {
        const isFilled = i < roundedRating;
        return (
          <span
            key={i}
            className={`material-symbols-outlined select-none ${isFilled ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
            style={{ 
              fontSize: `${size}px`, 
              width: `${size}px`, 
              height: `${size}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontVariationSettings: `'FILL' ${isFilled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 20`
            }}
          >
            star
          </span>
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          {rating.toFixed(1).replace('.', ',')}
        </span>
      )}
    </div>
  );
}
