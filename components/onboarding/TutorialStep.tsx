import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, X, Sparkles } from 'lucide-react';
import { TutorialStep as TutorialStepType } from './tutorialSteps';

interface TutorialStepProps {
  step: TutorialStepType;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  position: { top: number; left: number; transformOrigin: string };
}

export const TutorialStep: React.FC<TutorialStepProps> = ({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  position,
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isCentered = step.position === 'center';

  // Determine transform based on position
  let transform = 'translate(-50%, -50%)';
  if (!isCentered) {
    switch (step.position) {
      case 'top':
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        transform = 'translate(-50%, 0)';
        break;
      case 'left':
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        transform = 'translate(0, -50%)';
        break;
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[70] w-[calc(100vw-2rem)] max-w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto"
      style={{
        top: position.top,
        left: position.left,
        transform,
        transformOrigin: position.transformOrigin,
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
    >
      {/* Skip Button */}
      <button
        onClick={onSkip}
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Skip tutorial"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="p-5">
        {/* Icon for welcome step */}
        {isFirstStep && (
          <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
        )}

        <h3
          id="tutorial-title"
          className="text-lg font-bold text-slate-900 mb-2 pr-6"
        >
          {step.title}
        </h3>
        <p
          id="tutorial-description"
          className="text-sm text-slate-600 leading-relaxed"
        >
          {step.description}
        </p>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        {/* Progress Dots */}
        <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={totalSteps}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-brand-600'
                  : index < currentStep
                  ? 'bg-brand-300'
                  : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              onClick={onPrev}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={onNext}
            className="px-4 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-1"
          >
            {isLastStep ? 'Finish Tour' : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
