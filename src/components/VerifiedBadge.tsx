import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function VerifiedBadge({ className = '', showText = false, size = 'sm' }: VerifiedBadgeProps) {
  const sizes = {
    sm: { circle: 'w-4 h-4', icon: 'text-[10px]' },
    md: { circle: 'w-5 h-5', icon: 'text-[12px]' },
    lg: { circle: 'w-6 h-6', icon: 'text-[14px]' },
  };
  const s = sizes[size];
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className={`flex items-center justify-center bg-blue-500 rounded-full ${s.circle} text-white shadow-md shadow-blue-500/40 ring-1 ring-white/30`}>
        <span className={`material-symbols-outlined ${s.icon} font-bold`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
      </div>
      {showText && (
        <span className="text-xs font-semibold text-blue-400">Verificado</span>
      )}
    </div>
  );
}
