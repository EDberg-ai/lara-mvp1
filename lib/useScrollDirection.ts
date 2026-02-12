import { useState, useEffect, useRef, useCallback } from 'react';

export function useScrollDirection(threshold = 10) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const cumulativeDelta = useRef(0);
  const ticking = useRef(false);
  const isStabilized = useRef(false);
  const lastStateChange = useRef(0);

  // Cooldown period to prevent flickering (ms)
  const COOLDOWN = 150;

  const updateScroll = useCallback(() => {
    if (!isStabilized.current) {
      ticking.current = false;
      return;
    }

    const currentY = window.scrollY;
    const delta = currentY - lastScrollY.current;

    // Always update position tracking
    lastScrollY.current = currentY;

    // Skip if no movement
    if (delta === 0) {
      ticking.current = false;
      return;
    }

    // Check cooldown - skip if we recently changed state
    const now = Date.now();
    if (now - lastStateChange.current < COOLDOWN) {
      cumulativeDelta.current = 0; // Reset accumulator during cooldown
      ticking.current = false;
      return;
    }

    // Check if direction changed (signs differ)
    const directionChanged = (cumulativeDelta.current > 0 && delta < 0) ||
                             (cumulativeDelta.current < 0 && delta > 0);

    if (directionChanged) {
      // Reset cumulative on direction change
      cumulativeDelta.current = delta;
    } else {
      // Accumulate in same direction
      cumulativeDelta.current += delta;
    }

    // Trigger state change when cumulative exceeds threshold
    if (Math.abs(cumulativeDelta.current) >= threshold) {
      if (cumulativeDelta.current > 0 && currentY > 50) {
        setIsCollapsed(true);
        lastStateChange.current = now;
      } else if (cumulativeDelta.current < 0) {
        setIsCollapsed(false);
        lastStateChange.current = now;
      }
      // Reset after triggering
      cumulativeDelta.current = 0;
    }

    ticking.current = false;
  }, [threshold]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    cumulativeDelta.current = 0;
    lastStateChange.current = 0;

    const stabilizeTimer = setTimeout(() => {
      isStabilized.current = true;
      lastScrollY.current = window.scrollY;
    }, 100);

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScroll);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimeout(stabilizeTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [updateScroll]);

  return isCollapsed;
}
