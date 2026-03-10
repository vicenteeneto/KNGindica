import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  showText?: boolean;
}

export default function VerifiedBadge({ className = '', showText = false }: VerifiedBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="flex items-center justify-center bg-blue-500 rounded-full w-4 h-4 text-white shadow-sm">
        <span className="material-symbols-outlined text-[10px] font-bold">check</span>
      </div>
      {showText && (
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Verificado</span>
      )}
    </div>
  );
}
