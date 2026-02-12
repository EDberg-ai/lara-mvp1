import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { tutorialSteps, ONBOARDING_KEY } from './tutorialSteps';
import { TutorialOverlay } from './TutorialOverlay';
import { authApi, getToken } from '../../lib/api';
import { OnboardingContext, OnboardingContextType } from './OnboardingContext';

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);

  // Check onboarding status on mount - from API if authenticated, localStorage as fallback
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      const token = getToken();

      if (token) {
        // User is authenticated - check server status
        try {
          const profile = await authApi.getProfile();
          if (!profile.onboardingCompleted) {
            // Also check localStorage as a backup (in case they completed but API didn't save)
            const localCompleted = localStorage.getItem(ONBOARDING_KEY);
            if (localCompleted) {
              // Sync to server
              try {
                await authApi.completeOnboarding();
              } catch {
                // Ignore sync errors
              }
            } else {
              // Not completed - show tutorial after delay
              setTimeout(() => setIsActive(true), 500);
            }
          }
        } catch {
          // API failed - fall back to localStorage
          const completed = localStorage.getItem(ONBOARDING_KEY);
          if (!completed) {
            setTimeout(() => setIsActive(true), 500);
          }
        }
      } else {
        // Not authenticated - use localStorage only
        const completed = localStorage.getItem(ONBOARDING_KEY);
        if (!completed) {
          setTimeout(() => setIsActive(true), 500);
        }
      }

      setHasChecked(true);
    };

    checkOnboardingStatus();
  }, []);

  const currentStepData = isActive ? tutorialSteps[currentStep] : null;

  // Mark onboarding as complete - save to both API and localStorage
  const markComplete = useCallback(async () => {
    // Always save to localStorage as fallback
    localStorage.setItem(ONBOARDING_KEY, 'true');

    // Try to save to server if authenticated
    const token = getToken();
    if (token) {
      try {
        await authApi.completeOnboarding();
      } catch {
        // Ignore API errors - localStorage is already set
        console.warn('Failed to save onboarding status to server');
      }
    }
  }, []);

  const startTutorial = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete the tutorial
      markComplete();
      setIsActive(false);
    }
  }, [currentStep, markComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    markComplete();
    setIsActive(false);
  }, [markComplete]);

  const completeTutorial = useCallback(() => {
    markComplete();
    setIsActive(false);
  }, [markComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipTutorial();
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTutorial]);

  const value: OnboardingContextType = {
    isActive,
    currentStep,
    currentStepData,
    totalSteps: tutorialSteps.length,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {isActive && typeof document !== 'undefined' && createPortal(
        <TutorialOverlay />,
        document.body
      )}
    </OnboardingContext.Provider>
  );
};
