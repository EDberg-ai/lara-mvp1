import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GoalBoxProps {
  goalText: string;
  universal?: boolean;
}

export const GoalBox: React.FC<GoalBoxProps> = ({ goalText, universal = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div 
          className="flex items-start gap-3 cursor-pointer group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="mt-0.5 p-1.5 bg-navy-100 rounded-full text-navy-800">
            <Target className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Where am I going?
            </p>
            <p className="text-sm font-medium text-slate-900 leading-snug">
              {universal ? "Universal Learning Expectations" : "Success Criteria"}
            </p>
            
            <AnimatePresence>
              {isExpanded ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                    {goalText}
                  </p>
                </motion.div>
              ) : (
                <p className="text-sm text-slate-600 truncate mt-0.5">
                   Click to view the full success criteria for this task.
                </p>
              )}
            </AnimatePresence>
          </div>
          <button className="p-1 text-slate-400 group-hover:text-slate-600 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};