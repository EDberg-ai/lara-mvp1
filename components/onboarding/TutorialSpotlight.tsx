import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialSpotlightProps {
  targetSelector: string | null;
}

export const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({ targetSelector }) => {
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!targetSelector) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const elementRect = element.getBoundingClientRect();
        const padding = 8;
        setRect({
          top: elementRect.top - padding,
          left: elementRect.left - padding,
          width: elementRect.width + padding * 2,
          height: elementRect.height + padding * 2,
        });
      }
    };

    // Initial calculation
    updateRect();

    // Recalculate on scroll/resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [targetSelector]);

  // If no target or rect, show full overlay without spotlight
  if (!targetSelector || !rect) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60]"
      />
    );
  }

  // Create spotlight effect using box-shadow
  const shadowSpread = Math.max(window.innerWidth, window.innerHeight) * 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] pointer-events-none"
    >
      {/* Background overlay with spotlight cutout using box-shadow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        transition={{ duration: 0.3 }}
        className="absolute rounded-lg"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: `0 0 0 ${shadowSpread}px rgba(0, 0, 0, 0.6)`,
        }}
      />

      {/* Highlight ring around the target */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="absolute rounded-lg ring-2 ring-brand-500 ring-offset-2 ring-offset-transparent"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
    </motion.div>
  );
};

export const getTooltipPosition = (
  targetSelector: string | null,
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
): { top: number; left: number; transformOrigin: string } => {
  const tooltipWidth = 320;
  const tooltipHeight = 200;
  const padding = 16;

  if (!targetSelector || position === 'center') {
    return {
      top: window.innerHeight / 2,
      left: window.innerWidth / 2,
      transformOrigin: 'center center',
    };
  }

  const element = document.querySelector(targetSelector);
  if (!element) {
    return {
      top: window.innerHeight / 2,
      left: window.innerWidth / 2,
      transformOrigin: 'center center',
    };
  }

  const rect = element.getBoundingClientRect();
  const tooltipMargin = 16;

  let top: number;
  let left: number;
  let transformOrigin: string;

  switch (position) {
    case 'top':
      // Tooltip bottom edge at target top
      top = rect.top - tooltipMargin;
      left = rect.left + rect.width / 2;
      transformOrigin = 'bottom center';
      // Clamp: tooltip needs space above (tooltipHeight)
      top = Math.max(padding + tooltipHeight, top);
      break;
    case 'bottom':
      // Tooltip top edge at target bottom
      top = rect.bottom + tooltipMargin;
      left = rect.left + rect.width / 2;
      transformOrigin = 'top center';
      // Clamp: tooltip extends downward, needs space below
      top = Math.min(top, window.innerHeight - padding - tooltipHeight);
      break;
    case 'left':
      // Tooltip right edge at target left
      top = rect.top + rect.height / 2;
      left = rect.left - tooltipMargin;
      transformOrigin = 'center right';
      // Clamp vertical (centered)
      top = Math.max(padding + tooltipHeight / 2, Math.min(top, window.innerHeight - padding - tooltipHeight / 2));
      break;
    case 'right':
      // Tooltip left edge at target right
      top = rect.top + rect.height / 2;
      left = rect.right + tooltipMargin;
      transformOrigin = 'center left';
      // Clamp vertical (centered)
      top = Math.max(padding + tooltipHeight / 2, Math.min(top, window.innerHeight - padding - tooltipHeight / 2));
      break;
    default:
      return {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        transformOrigin: 'center center',
      };
  }

  // Clamp horizontal (always centered horizontally)
  left = Math.max(padding + tooltipWidth / 2, Math.min(left, window.innerWidth - padding - tooltipWidth / 2));

  return { top, left, transformOrigin };
};
