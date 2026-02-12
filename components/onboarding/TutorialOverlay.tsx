import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOnboarding } from './useOnboarding';
import { TutorialSpotlight, getTooltipPosition } from './TutorialSpotlight';
import { TutorialStep } from './TutorialStep';

export const TutorialOverlay: React.FC = () => {
  const {
    isActive,
    currentStep,
    currentStepData,
    totalSteps,
    nextStep,
    prevStep,
    skipTutorial,
  } = useOnboarding();

  const [tooltipPosition, setTooltipPosition] = useState(() =>
    getTooltipPosition(null, 'center')
  );

  // Update tooltip position when step changes
  useEffect(() => {
    if (!currentStepData) return;

    const updatePosition = () => {
      const position = getTooltipPosition(
        currentStepData.target,
        currentStepData.position
      );
      setTooltipPosition(position);
    };

    // First, scroll the target element into view
    const scrollAndPosition = () => {
      if (currentStepData.target) {
        const element = document.querySelector(currentStepData.target);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }

      // Then calculate position after a short delay for scroll to complete
      setTimeout(updatePosition, 300);
    };

    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollAndPosition, 50);

    // Also update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStepData]);

  // Respect reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!isActive || !currentStepData) return null;

  return (
    <AnimatePresence>
      {/* Backdrop with Spotlight */}
      <TutorialSpotlight
        key={`spotlight-${currentStep}`}
        targetSelector={currentStepData.target}
      />

      {/* Click blocker - BEFORE tooltip so tooltip is on top */}
      <div
        key="click-blocker"
        className="fixed inset-0"
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{ pointerEvents: 'auto', zIndex: 65 }}
      />

      {/* Tutorial Step Tooltip - renders last, on top */}
      <TutorialStep
        key={`step-${currentStep}`}
        step={currentStepData}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTutorial}
        position={tooltipPosition}
      />
    </AnimatePresence>
  );
};
