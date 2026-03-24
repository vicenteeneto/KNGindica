import React, { useState, useEffect, useRef } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function PullToRefresh({ children }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    // Only enabled on devices recognizing touch.
    if (!('ontouchstart' in window)) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Check if scroll is at the very top
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      
      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      // Ensure we are pulling downwards from the top of the page
      if (distance > 0 && window.scrollY <= 0) {
        // Prevent default browser behavior (like overscroll glow/refresh natively built into some browsers)
        if (e.cancelable) e.preventDefault();
        
        // Add friction/resistance to the pull
        const resistance = distance * 0.4;
        setPullDistance(Math.min(resistance, 120));
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      // Threshold to trigger refresh
      if (pullDistance > 60 && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(60); // Lock it visualy while reloading
        
        // Brief visual timeout before hard reloading
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setPullDistance(0);
      }
    };

    // Attach passive: false to touchmove to allow preventDefault()
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing]);

  return (
    <>
      {/* Floating Refresh Indicator */}
      <div 
        className="fixed top-0 left-0 w-full flex justify-center z-[99999] pointer-events-none"
        style={{
          transform: `translateY(${Math.max(0, pullDistance - 40)}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          transition: isPulling.current ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out'
        }}
      >
        <div 
          className="size-10 bg-white dark:bg-slate-800 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center border border-slate-100 dark:border-slate-700 mt-4"
          style={{ 
            transform: `rotate(${pullDistance * 3}deg)`,
            transition: isPulling.current ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          <span className={`material-symbols-outlined text-primary font-bold transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
             refresh
          </span>
        </div>
      </div>
      
      {/* Main App Content that moves slightly down for parallax effect */}
      <div style={{ 
        transform: isPulling.current && pullDistance > 0 ? `translateY(${pullDistance * 0.15}px)` : 'none', 
        transition: isPulling.current ? 'none' : 'transform 0.3s ease-out'
      }}>
        {children}
      </div>
    </>
  );
}
