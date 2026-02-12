import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft, CheckCircle, Edit2, AlertCircle, RefreshCw, Clock, Target, ChevronDown, ChevronUp, Loader2, MoreHorizontal } from 'lucide-react';
import { Student, Submission, FeedbackSession, Task } from '../../types';
import { FeedbackEditForm } from './FeedbackEditForm';
import { FeedbackWarnings } from './FeedbackWarnings';
import { validateFeedback, FeedbackWarning } from '../../lib/validation';
import { useScrollDirection } from '../../lib/useScrollDirection';

interface TeacherReviewViewProps {
  student: Student;
  submission: Submission;
  task?: Task; // Task for validation against success criteria
  onBack: () => void;
  onApprove: (studentId: string) => void;
  onUpdateFeedback: (studentId: string, feedback: FeedbackSession) => void;
  onRegenerateFeedback: (studentId: string) => Promise<boolean>;
}

export const TeacherReviewView: React.FC<TeacherReviewViewProps> = ({
  student,
  submission,
  task,
  onBack,
  onApprove,
  onUpdateFeedback,
  onRegenerateFeedback
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPreviousContent, setShowPreviousContent] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  // Collapsible header state
  const isHeaderCollapsed = useScrollDirection(10);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMoreActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Run validation on feedback
  const allWarnings = useMemo(() => {
    if (!submission.feedback) return [];
    return validateFeedback(submission.feedback, task?.successCriteria || []);
  }, [submission.feedback, task?.successCriteria]);

  // Filter out dismissed warnings
  const activeWarnings = useMemo(() => {
    return allWarnings.filter(w => !dismissedWarnings.has(w.id));
  }, [allWarnings, dismissedWarnings]);

  const handleDismissWarning = (warningId: string) => {
    setDismissedWarnings(prev => new Set([...prev, warningId]));
  };

  const handleDismissAllWarnings = () => {
    setDismissedWarnings(new Set(allWarnings.map(w => w.id)));
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    // Clear dismissed warnings when regenerating
    setDismissedWarnings(new Set());
    await onRegenerateFeedback(student.id);
    setIsRegenerating(false);
  };

  if (!submission.feedback) {
    return null;
  }

  const handleSaveFeedback = (updatedFeedback: FeedbackSession) => {
    onUpdateFeedback(student.id, updatedFeedback);
    setIsEditing(false);
  };

  // If editing, show edit form
  if (isEditing) {
    return (
      <FeedbackEditForm
        initialFeedback={submission.feedback}
        onSave={handleSaveFeedback}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const Badge = ({ variant, children }: { variant: string; children: React.ReactNode }) => {
    const styles: Record<string, string> = {
      blue: "bg-blue-100 text-blue-700 border-blue-200",
      green: "bg-emerald-100 text-emerald-700 border-emerald-200",
      amber: "bg-amber-100 text-amber-700 border-amber-200",
      purple: "bg-purple-100 text-purple-700 border-purple-200"
    };
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${styles[variant]}`}>
        {children}
      </span>
    );
  };

  const isRevision = submission.revisionCount > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Collapsible Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar - Always Visible */}
          <div className="flex items-center justify-between h-14">
            {/* Left: Back + Student Name */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="font-medium text-slate-900 truncate text-base">{student.name}</span>
              {isRevision && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Rev #{submission.revisionCount}
                </span>
              )}
            </div>

            {/* Right: Compact Dropdown (when collapsed) + Mastery Toggle + Approve */}
            <div className="flex items-center gap-2">
              {/* Compact Actions Dropdown - Only visible when collapsed */}
              <AnimatePresence>
                {isHeaderCollapsed && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="relative"
                  >
                    <button
                      onClick={() => setShowMoreActions(!showMoreActions)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {showMoreActions && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px] z-20"
                        >
                          <button
                            onClick={() => {
                              handleRegenerate();
                              setShowMoreActions(false);
                            }}
                            disabled={isRegenerating}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {isRegenerating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setShowMoreActions(false);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Approve Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove(student.id)}
                className="whitespace-nowrap"
              >
                <CheckCircle className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Approve & Send</span>
              </Button>
            </div>
          </div>

          {/* Collapsible Section: Title Row + Actions Row */}
          <AnimatePresence initial={false}>
            {!isHeaderCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                {/* Title Row */}
                <div className="flex items-center gap-4 py-2 border-t border-slate-100">
                  <h1 className="text-lg font-semibold text-slate-900">Review Feedback</h1>
                  {submission.timeElapsed && (
                    <div
                      className="flex items-center gap-1.5 text-sm text-slate-500 ml-auto"
                      title="Time from when the student opened the task to when they submitted"
                    >
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(submission.timeElapsed)}</span>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="text-slate-600"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1.5" />
                          Regenerate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-slate-600"
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                    <span className="text-xs text-slate-400 ml-1">1 credit</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Two-Column Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Student's Work */}
          <div className="space-y-4">
            {/* Selected Next Step - Show if this is a revision */}
            {isRevision && submission.selectedNextStep && (
              <Card className="border-purple-200 bg-purple-50">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-900">Student's Selected Focus Area</h3>
                  </div>
                  <p className="text-purple-800">
                    <span className="font-medium">{submission.selectedNextStep.actionVerb}</span>{' '}
                    {submission.selectedNextStep.target}
                  </p>
                  <p className="text-sm text-purple-700">
                    Success indicator: {submission.selectedNextStep.successIndicator}
                  </p>
                </div>
              </Card>
            )}

            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {isRevision ? 'Revised Submission' : 'Student Submission'}
                  </h2>
                  <Badge variant={isRevision ? 'purple' : 'blue'}>
                    {isRevision ? 'Revised Work' : 'Original Writing'}
                  </Badge>
                </div>

                <div className="prose prose-sm max-w-none">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {submission.content}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-slate-500">
                  Submitted: {new Date(submission.timestamp).toLocaleString()}
                </div>

                {/* Previous Content Comparison - Show if this is a revision */}
                {isRevision && submission.previousContent && (
                  <div className="border-t border-slate-200 pt-4">
                    <button
                      onClick={() => setShowPreviousContent(!showPreviousContent)}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      {showPreviousContent ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {showPreviousContent ? 'Hide' : 'Show'} Previous Version
                    </button>

                    {showPreviousContent && (
                      <div className="mt-3 bg-amber-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-xs font-medium text-amber-700 uppercase mb-2">Previous Submission</p>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-sm">
                          {submission.previousContent}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right: LARA-Generated Feedback */}
          <div className="space-y-4">
            {/* Validation Warnings */}
            {activeWarnings.length > 0 && (
              <FeedbackWarnings
                warnings={activeWarnings}
                onDismiss={handleDismissWarning}
                onDismissAll={handleDismissAllWarnings}
              />
            )}

            <Card>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    LARA-Generated Feedback
                  </h2>
                  <Badge variant="green">Ready to Review</Badge>
                </div>

                {/* Goal */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Learning Goal</h3>
                  <p className="text-slate-600">{submission.feedback.goal}</p>
                </div>

                {/* Strengths */}
                <div>
                  <h3 className="text-sm font-medium text-emerald-700 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Working Well
                  </h3>
                  <div className="space-y-3">
                    {submission.feedback.strengths.map((strength, idx) => (
                      <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-sm text-emerald-900">{strength.text}</p>
                        {strength.anchors && strength.anchors.length > 0 && (
                          <div className="mt-2 text-xs text-emerald-700 italic">
                            "{strength.anchors[0]}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Areas */}
                <div>
                  <h3 className="text-sm font-medium text-amber-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Needs Focus
                  </h3>
                  <div className="space-y-3">
                    {submission.feedback.growthAreas.map((area, idx) => (
                      <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-900 whitespace-pre-wrap">{area.text}</p>
                        {area.anchors && area.anchors.length > 0 && (
                          <div className="mt-2 text-xs text-amber-700 italic">
                            "{area.anchors[0]}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Steps paired with Reflection Prompts */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Next Steps & Reflection</h3>
                  <div className="space-y-3">
                    {submission.feedback.nextSteps.map((step, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Next step</p>
                          <p className="text-sm font-medium text-slate-900">
                            {step.actionVerb} {step.target}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {step.successIndicator}
                          </p>
                        </div>
                        {step.reflectionPrompt && (
                          <div className="border-t border-slate-200 pt-3">
                            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Reflection prompt</p>
                            <p className="text-sm text-purple-900 italic">
                              "{step.reflectionPrompt}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};
