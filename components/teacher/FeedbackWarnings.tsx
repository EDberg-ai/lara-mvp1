import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { FeedbackWarning } from '../../lib/validation';

interface FeedbackWarningsProps {
  warnings: FeedbackWarning[];
  onDismiss: (warningId: string) => void;
  onDismissAll: () => void;
}

export const FeedbackWarnings: React.FC<FeedbackWarningsProps> = ({
  warnings,
  onDismiss,
  onDismissAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (warnings.length === 0) {
    return null;
  }

  const strongWarnings = warnings.filter(w => w.severity === 'strong');
  const softWarnings = warnings.filter(w => w.severity === 'soft');

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-blue-50/50 border-b border-slate-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-slate-900">Feedback Balance Check</h3>
          </div>
          <div className="flex items-center gap-2">
            {strongWarnings.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                {strongWarnings.length} worth reviewing
              </span>
            )}
            {softWarnings.length > 0 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                {softWarnings.length} suggestion{softWarnings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismissAll();
            }}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            Dismiss All
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Warning List */}
      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {[...strongWarnings, ...softWarnings].map((warning) => (
            <div
              key={warning.id}
              className="p-4 bg-white flex items-start gap-3"
            >
              <div className="mt-0.5 text-blue-400">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-slate-800">
                    {warning.title}
                  </h4>
                  {warning.location && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {warning.location}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {warning.description}
                </p>
                {warning.matchedText && (
                  <p className="text-xs mt-2 text-slate-500 italic">
                    Found: "{warning.matchedText}"
                  </p>
                )}
              </div>
              <button
                onClick={() => onDismiss(warning.id)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {isExpanded && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Suggestions only. You can approve as is.
          </p>
        </div>
      )}
    </div>
  );
};
