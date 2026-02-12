import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Task, FeedbackSession } from '../../types';
import { User, BookOpen, Clock, Send, AlertCircle, RefreshCw, KeyRound, Loader2, FileText, ExternalLink, CheckCircle } from 'lucide-react';
import { authApi } from '../../lib/api';

interface StudentEntryProps {
  task?: Task; // Task may not be available initially
  onJoin: (name: string) => void;
  onSubmitWork: (content: string, feedback: FeedbackSession | null, timeElapsed?: number) => void;
  isPending: boolean; // Is waiting for teacher to generate and approve feedback
  studentId?: string; // Student ID for generating shareable link
  taskCode?: string; // Task code from URL (for task-specific access)
  submissionError?: string | null; // Error message if submission failed
  onRetrySubmit?: () => void; // Callback to retry submission
  onValidateCode?: (code: string) => void; // Callback when code is validated
}

type JoinPhase = 'enter_pin' | 'enter_name' | 'writing' | 'waiting';

export const StudentEntry: React.FC<StudentEntryProps> = ({
  task,
  onJoin,
  onSubmitWork,
  isPending,
  studentId,
  taskCode: initialTaskCode,
  submissionError,
  onRetrySubmit,
  onValidateCode
}) => {
  // Determine initial phase based on whether we have a task code
  const getInitialPhase = (): JoinPhase => {
    if (isPending) return 'waiting';
    return 'enter_pin'; // Always start at PIN entry
  };

  const [phase, setPhase] = useState<JoinPhase>(getInitialPhase);
  const [taskCode, setTaskCode] = useState(initialTaskCode || '');
  const [validatedTaskTitle, setValidatedTaskTitle] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [attachmentLoading, setAttachmentLoading] = useState(true);
  const [attachmentError, setAttachmentError] = useState(false);

  // Timer state
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update phase if parent says we are pending
  useEffect(() => {
    if (isPending) {
      setPhase('waiting');
    }
  }, [isPending]);

  // Timer logic
  useEffect(() => {
    if (phase === 'writing') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase]);

  // Track previous imageUrl to avoid unnecessary reloads
  const prevImageUrlRef = useRef<string | undefined>(undefined);

  // Reset attachment loading only when imageUrl ACTUALLY changes (not just object reference)
  useEffect(() => {
    if (task?.imageUrl && task?.fileType !== 'pdf') {
      // Only reset if URL actually changed, not just object reference
      if (task.imageUrl !== prevImageUrlRef.current) {
        setAttachmentLoading(true);
        setAttachmentError(false);
        prevImageUrlRef.current = task.imageUrl;
      }
    }
  }, [task?.imageUrl, task?.fileType]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle PIN validation
  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskCode.trim()) return;

    setIsValidating(true);
    setCodeError(null);

    try {
      const response = await authApi.validateCode(taskCode.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      if (response.valid) {
        setValidatedTaskTitle(response.taskTitle);
        setPhase('enter_name');
        // Update URL with task code
        const url = new URL(window.location.href);
        url.searchParams.set('taskCode', taskCode.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        window.history.pushState({}, '', url);
        // Notify parent
        onValidateCode?.(taskCode);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid code. Please try again.';
      setCodeError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle name entry and join
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name);
      setPhase('writing');
    }
  };

  // Handle work submission
  const handleSubmit = async () => {
    if (!content.trim()) return;
    onSubmitWork(content, null, timeElapsed);
    setPhase('waiting');
  };

  // Phase 1: Enter PIN (Kahoot-style)
  if (phase === 'enter_pin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-400 to-navy-800 p-4">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gold-100 text-gold-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-logo font-extrabold text-navy-800">LARA</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your code</p>
          </div>

          <form onSubmit={handleValidateCode} className="space-y-4">
            <div>
              <input
                autoFocus
                required
                type="text"
                className="w-full px-4 py-4 text-center text-2xl font-mono font-bold tracking-widest border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none uppercase"
                placeholder="9A01"
                value={taskCode}
                onChange={(e) => {
                  setTaskCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  setCodeError(null);
                }}
                maxLength={6}
              />
              {codeError && (
                <p className="text-red-600 text-sm mt-2 text-center">{codeError}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold"
              size="lg"
              disabled={taskCode.length < 4 || isValidating}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Enter'
              )}
            </Button>
          </form>

        </Card>
      </div>
    );
  }

  // Phase 2: Enter Name (Kahoot-style - no task content revealed)
  if (phase === 'enter_name') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Found it!</h2>
            <p className="text-slate-500 text-sm mt-1">Your teacher is ready for you</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your Student Code</label>
              <input
                autoFocus
                required
                type="text"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="e.g., 9A01"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">Use the code your teacher gave you (e.g., 9A01). Don't type your name.</p>
            </div>
            <Button type="submit" className="w-full h-12 text-base" size="lg">
              Start Learning
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Phase 4: Waiting for feedback
  if (phase === 'waiting' || isPending) {
    //@ts-ignore
    const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
    let shareableLink = '';
    if (studentId) {
      shareableLink = `${baseUrl}?studentId=${studentId}`;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Work Submitted</h2>
              <p className="text-slate-600">
                Your teacher will prepare your feedback shortly.
              </p>
            </div>

            {/* Shareable Link */}
            {shareableLink && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Save this link to check your feedback later:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableLink}
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareableLink);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Phase 3: Writing (full task revealed)
  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 bg-brand-50 rounded text-brand-700 flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">{task?.title || 'Learning Task'}</span>
          </div>

          {/* Timer Display */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-gold-50 px-3 py-1.5 rounded-lg border border-gold-200">
              <Clock className="w-4 h-4 text-gold-600" />
              <div className="text-right">
                <div className="text-base font-bold text-gold-700 font-mono leading-none">
                  {formatTime(timeElapsed)}
                </div>
              </div>
            </div>
            <span className="text-xs text-slate-500 hidden sm:inline">{name}</span>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Submission Error Banner */}
        {submissionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Submission failed</p>
              <p className="text-sm text-red-700 mt-1">{submissionError}</p>
              {onRetrySubmit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetrySubmit}
                  className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Full Question Display */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Question</h3>
          <p className="text-lg font-semibold text-slate-900 leading-relaxed">{task?.title || 'Loading...'}</p>
        </div>

        {(task?.prompt || task?.imageUrl) && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-5">
          {task?.prompt && (
            <>
              <h3 className="text-sm font-bold text-brand-800 uppercase tracking-wide mb-2">Prompt</h3>
              <p className="text-slate-800 leading-relaxed">{task.prompt}</p>
            </>
          )}

          {/* Task Attachment (Image or PDF) */}
          {task?.imageUrl && (
            <div className="mt-4">
              {task.fileType === 'pdf' ? (
                <a
                  href={task.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-3 p-4 bg-white border border-brand-200 rounded-lg hover:bg-brand-50 hover:border-brand-300 transition-all shadow-sm"
                >
                  <div className="p-2.5 bg-red-100 rounded-lg">
                    <FileText className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">View Task Document</p>
                    <p className="text-xs text-slate-500">Click to download PDF</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-brand-500 flex-shrink-0" />
                </a>
              ) : (
                <div className="relative">
                  {/* Loading skeleton */}
                  {attachmentLoading && !attachmentError && (
                    <div className="w-full h-48 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                  )}

                  {/* Error state with retry */}
                  {attachmentError && (
                    <div className="flex flex-col items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                      <p className="text-sm text-red-700">Failed to load image</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAttachmentError(false);
                          setAttachmentLoading(true);
                        }}
                        className="text-red-600 border-red-300"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Retry
                      </Button>
                    </div>
                  )}

                  {/* Actual image - hidden while loading, hidden on error */}
                  <img
                    src={task.imageUrl}
                    alt="Task reference image"
                    className={`max-w-full max-h-80 w-auto mx-auto rounded-lg border border-brand-200 shadow-sm object-contain transition-opacity ${
                      attachmentLoading || attachmentError ? 'absolute opacity-0 h-0' : 'opacity-100'
                    }`}
                    onLoad={() => {
                      setAttachmentLoading(false);
                      setAttachmentError(false);
                    }}
                    onError={() => {
                      setAttachmentLoading(false);
                      setAttachmentError(true);
                      console.error('Failed to load task image:', task.imageUrl);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 ml-1">Your Response</label>
          <textarea
            className="w-full h-96 p-5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none text-lg leading-relaxed shadow-sm resize-none font-serif"
            placeholder="Start typing here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-20">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Character Counter */}
          <div className="flex items-center justify-between text-sm px-1">
            <div className="flex items-center gap-2">
              {content.length >= 10 ? (
                <>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-600 font-medium">
                    Ready to submit!
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">
                    {10 - content.length} more characters needed
                  </span>
                </>
              )}
            </div>
            <span className="text-slate-400 font-mono text-xs">
              {content.length} characters
            </span>
          </div>

          {/* Enhanced Submit Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleSubmit}
              className="w-full h-14 text-lg font-bold shadow-xl shadow-navy-800/30"
              disabled={content.length < 10}
            >
              <Send className="w-5 h-5 mr-2" />
              {content.length >= 10 ? 'Submit for Feedback!' : `Write ${10 - content.length} more...`}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
