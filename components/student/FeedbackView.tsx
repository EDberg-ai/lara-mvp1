import React, { useState } from 'react';
import { FeedbackSession, NextStep, Task, Submission } from '../../types';
import { GoalBox } from './GoalBox';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CheckCircle2, AlertCircle, ArrowRight, CornerDownRight, Sparkles, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedbackViewProps {
  sessionData: FeedbackSession;
  onContinue: (step: NextStep) => void;
  task?: Task; // For learning notes
  submission?: Submission; // For learning notes
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  sessionData,
  onContinue,
  task,
  submission
}) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [showTaskTooltip, setShowTaskTooltip] = useState(false);
  const [showProcessTooltip, setShowProcessTooltip] = useState(false);

  const selectedStep = sessionData.nextSteps.find(s => s.id === selectedStepId);

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Principle 1 & 2: Start with the Goal */}
      <GoalBox
        goalText={sessionData.goal}
        universal={false}
      />

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        
        {/* Card 1: What's working well */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-white">
            <div className="bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">What's working well</h2>
          </div>
          <div className="p-5 space-y-5">
            {sessionData.strengths.map((item) => (
              <div key={item.id} className="relative pl-4 border-l-2 border-emerald-100">
                <div className="mb-1.5 flex items-center gap-1.5">
                   <Badge type={item.type} />
                   {item.type === 'task' && (
                     <div className="relative">
                       <button
                         onClick={() => setShowTaskTooltip(!showTaskTooltip)}
                         onBlur={() => setTimeout(() => setShowTaskTooltip(false), 200)}
                         className="p-0.5 text-slate-400 hover:text-brand-600 rounded-full"
                       >
                         <Info className="w-3.5 h-3.5" />
                       </button>
                       {showTaskTooltip && (
                         <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-10 text-xs text-slate-600">
                           This feedback is about your answer to the question. It checks whether you included the key ideas the task asked for.
                         </div>
                       )}
                     </div>
                   )}
                   {item.type === 'process' && (
                     <div className="relative">
                       <button
                         onClick={() => setShowProcessTooltip(!showProcessTooltip)}
                         onBlur={() => setTimeout(() => setShowProcessTooltip(false), 200)}
                         className="p-0.5 text-slate-400 hover:text-brand-600 rounded-full"
                       >
                         <Info className="w-3.5 h-3.5" />
                       </button>
                       {showProcessTooltip && (
                         <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-10 text-xs text-slate-600">
                           This feedback is about how you built your answer. It looks at how clearly you organised your ideas and explained your reasoning.
                         </div>
                       )}
                     </div>
                   )}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {item.text}
                </p>
                {/* Traceability: Show anchor from student work */}
                {item.anchors && item.anchors.length > 0 && (
                   <div className="mt-2 text-xs text-slate-500 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 italic flex items-start gap-2">
                     <span className="text-emerald-300">❝</span>
                     {item.anchors[0]}
                   </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Card 2: What needs attention */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-white">
             <div className="bg-amber-100 p-1.5 rounded-full text-amber-600">
                <AlertCircle className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Needs Focus</h2>
          </div>
          <div className="p-5 space-y-5">
             {sessionData.growthAreas.map((item) => (
              <div key={item.id} className="relative pl-4 border-l-2 border-amber-100">
                <div className="mb-1.5 flex items-center gap-1.5">
                   <Badge type={item.type} />
                   {item.type === 'task' && (
                     <div className="relative">
                       <button
                         onClick={() => setShowTaskTooltip(!showTaskTooltip)}
                         onBlur={() => setTimeout(() => setShowTaskTooltip(false), 200)}
                         className="p-0.5 text-slate-400 hover:text-brand-600 rounded-full"
                       >
                         <Info className="w-3.5 h-3.5" />
                       </button>
                       {showTaskTooltip && (
                         <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-10 text-xs text-slate-600">
                           This feedback is about your answer to the question. It checks whether you included the key ideas the task asked for.
                         </div>
                       )}
                     </div>
                   )}
                   {item.type === 'process' && (
                     <div className="relative">
                       <button
                         onClick={() => setShowProcessTooltip(!showProcessTooltip)}
                         onBlur={() => setTimeout(() => setShowProcessTooltip(false), 200)}
                         className="p-0.5 text-slate-400 hover:text-brand-600 rounded-full"
                       >
                         <Info className="w-3.5 h-3.5" />
                       </button>
                       {showProcessTooltip && (
                         <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg z-10 text-xs text-slate-600">
                           This feedback is about how you built your answer. It looks at how clearly you organised your ideas and explained your reasoning.
                         </div>
                       )}
                     </div>
                   )}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {item.text}
                </p>
                {/* Traceability Requirement: Map to specific work if available */}
                {item.anchors && item.anchors.length > 0 && (
                   <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic flex items-start gap-2">
                     <span className="text-slate-300">❝</span>
                     {item.anchors[0]}
                   </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Card 3: Choose One Next Step */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md overflow-hidden shadow-brand-500/5 border border-brand-100 ring-4 ring-brand-50"
        >
          <div className="px-5 py-4 border-b flex items-center gap-2.5 border-brand-100 bg-gradient-to-r from-brand-50 to-white">
             <div className="p-1.5 rounded-full bg-brand-100 text-brand-600">
                <CornerDownRight className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-brand-900">
              Select Next Step
            </h2>
          </div>
          <div className="p-2 bg-brand-50/10">
            <p className="px-4 pt-3 pb-2 text-xs text-slate-500 font-medium">
              Choose the action you will take to improve your writing:
            </p>
            <div className="space-y-2 p-2">
              {sessionData.nextSteps.map((step) => (
                <label 
                  key={step.id}
                  className={`group relative flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedStepId === step.id 
                      ? 'bg-brand-50 border-brand-500 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-brand-200 hover:shadow-sm'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      selectedStepId === step.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 group-hover:border-brand-300'
                  }`}>
                      {selectedStepId === step.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input 
                    type="radio" 
                    name="nextStep"
                    value={step.id}
                    checked={selectedStepId === step.id}
                    onChange={() => setSelectedStepId(step.id)}
                    className="sr-only" // Visually hidden but accessible
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm leading-snug">
                      <span className="text-brand-700 font-bold">{step.actionVerb}</span> {step.target}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 bg-white/50 inline-flex px-2 py-1 rounded border border-slate-100">
                        <Sparkles className="w-3 h-3 text-brand-400" />
                        {step.successIndicator}
                    </div>
                    {step.reflectionPrompt && (
                      <p className="mt-2 text-sm text-slate-500 italic bg-slate-50 p-2 rounded">
                        <span className="font-medium not-italic">Reflect:</span> {step.reflectionPrompt}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </motion.section>
      </main>

      {/* Floating Action Bar - Mobile First Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg z-50">
        <div className="max-w-xl mx-auto space-y-2">
          <Button
            className="w-full h-12 text-base shadow-brand-500/20 shadow-lg font-semibold tracking-wide"
            size="lg"
            variant="primary"
            disabled={!selectedStepId}
            onClick={() => selectedStep && onContinue(selectedStep)}
            leftIcon={<ArrowRight className="w-5 h-5" />}
          >
            {selectedStep ? `Continue: ${selectedStep.ctaText}` : "Select a step to continue"}
          </Button>
        </div>
      </div>
    </div>
  );
};