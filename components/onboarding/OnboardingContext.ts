import { createContext } from 'react';
import { TutorialStep } from './tutorialSteps';

export interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  currentStepData: TutorialStep | null;
  totalSteps: number;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

export const OnboardingContext = createContext<OnboardingContextType | null>(null);
