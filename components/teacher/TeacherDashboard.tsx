import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Student, Task, Submission, Folder, TeacherCredits } from '../../types';
import { Users, Clock, ArrowUpRight, Plus, ClipboardCheck, List, Power, PowerOff, Zap, Loader2, Pencil, UserMinus, X, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CreateTaskForm } from './CreateTaskForm';
import { ClassInsightsView } from './ClassInsightsView';
import { StudentList } from './StudentList';
import { TaskList } from './TaskList';
import { TaskSelector } from './TaskSelector';
import { FolderManagement } from './FolderManagement';
import { ShareTaskCard } from './ShareTaskCard';
import { useAppStore } from '../../lib/store';
import { sessionsApi } from '../../lib/api';
import { useNotification } from '../../lib/useNotification';

interface SessionInfo {
  id: string;
  isLive: boolean;
  dataPersisted: boolean;
  dataExpiresAt: string | null;
}

interface TeacherDashboardProps {
  students: Student[];
  tasks: Task[];
  submissions: Record<string, Submission>;
  selectedTaskId: string;
  activeTab: string;
  folders: Folder[];
  credits: TeacherCredits;
  sessionFeedbacksGenerated?: number;
  sessionInfo?: SessionInfo | null;
  onNavigate: (tab: string) => void;
  onCreateTask: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onApproveFeedback: (studentId: string) => void;
  onNavigateToReview: (studentId: string) => void;
  onSelectTask: (taskId: string) => void;
  onDeactivateTask: (taskId: string) => void;
  onReactivateTask: (taskId: string) => void;
  onCreateFolder: (name: string, description?: string, color?: string) => string;
  onMoveTaskToFolder: (taskId: string, folderId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
  onUpdateFolder: (folderId: string, name: string, description?: string, color?: string) => void;
  onGenerateFeedback: (studentId: string) => Promise<boolean>;
  onGenerateFeedbackBatch: (studentIds: string[]) => Promise<{ success: number; failed: number }>;
  onRemoveStudent?: (studentId: string) => Promise<boolean>;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  students,
  tasks,
  submissions,
  selectedTaskId,
  activeTab,
  folders,
  credits,
  sessionFeedbacksGenerated,
  sessionInfo,
  onNavigate,
  onCreateTask,
  onUpdateTask,
  onApproveFeedback,
  onNavigateToReview,
  onSelectTask,
  onDeactivateTask,
  onReactivateTask,
  onCreateFolder,
  onMoveTaskToFolder,
  onDeleteFolder,
  onUpdateFolder,
  onGenerateFeedback,
  onGenerateFeedbackBatch,
  onRemoveStudent
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [generatingStudentId, setGeneratingStudentId] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const currentTask = tasks.find(t => t.id === selectedTaskId) || tasks[0];
  const notify = useNotification();

  // Filter students to show those with submissions OR active students for this task
  const taskStudents = students.filter(student => {
    const submission = submissions[student.id];
    // Show if has submission for this task
    if (submission && submission.taskId === currentTask?.id) {
      return true;
    }
    // Also show active students who joined this task (no submission yet)
    if (student.status === 'active' && student.taskId === currentTask?.id) {
      return true;
    }
    return false;
  });

  const activeStudents = taskStudents.filter(s => s.status !== 'completed').length;

  // Helper for Student List Table
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        active: "bg-slate-100 text-slate-600",
        ready_for_feedback: "bg-purple-100 text-purple-700",
        generating: "bg-blue-100 text-blue-700",
        submitted: "bg-blue-100 text-blue-700",
        feedback_ready: "bg-emerald-100 text-emerald-700",
        revising: "bg-amber-100 text-amber-700",
        completed: "bg-gradient-to-r from-gold-400 to-gold-500 text-navy-800",
    };
    const labels: Record<string, string> = {
        active: "Writing",
        ready_for_feedback: "Ready for Feedback",
        generating: "Generating...",
        submitted: "Needs Review",
        feedback_ready: "Feedback Sent",
        revising: "Revising",
        completed: "Done"
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${styles[status] || styles.active}`}>
            {labels[status] || status}
        </span>
    );
  };

  // Handle generating feedback for a single student
  const handleGenerateFeedback = async (studentId: string) => {
    setGeneratingStudentId(studentId);
    try {
      const success = await onGenerateFeedback(studentId);
      if (success) {
        notify.success('Feedback Generated', 'Review the feedback and click Approve & Send to deliver it.');
      } else {
        notify.error('Generation Failed', 'Could not generate feedback. Please try again.');
      }
    } catch (error) {
      notify.error('Generation Failed', 'An error occurred while generating feedback.');
    }
    setGeneratingStudentId(null);
  };

  // Handle batch generation
  const handleBatchGenerate = async () => {
    const readyStudents = taskStudents.filter(s => s.status === 'ready_for_feedback');
    if (readyStudents.length === 0) return;

    setIsBatchGenerating(true);
    try {
      const result = await onGenerateFeedbackBatch(readyStudents.map(s => s.id));
      if (result.success > 0 && result.failed === 0) {
        notify.success('Batch Complete', `Generated feedback for ${result.success} learner${result.success > 1 ? 's' : ''}.`);
      } else if (result.success > 0 && result.failed > 0) {
        notify.warning('Partially Complete', `Generated ${result.success}, failed ${result.failed}.`);
      } else {
        notify.error('Batch Failed', 'Could not generate feedback for any learners.');
      }
    } catch (error) {
      notify.error('Batch Failed', 'An error occurred during batch generation.');
    }
    setIsBatchGenerating(false);
  };

  // Count students ready for feedback
  const readyForFeedbackCount = taskStudents.filter(s => s.status === 'ready_for_feedback').length;

  // Handle removing a student
  const handleRemoveStudent = async () => {
    if (!studentToRemove || !onRemoveStudent) return;
    setIsRemoving(true);
    try {
      const success = await onRemoveStudent(studentToRemove.id);
      if (success) {
        notify.success('Learner Removed', `${studentToRemove.name} has been removed from the session.`);
      } else {
        notify.error('Remove Failed', 'Could not remove the learner. Please try again.');
      }
      setStudentToRemove(null);
    } catch (error) {
      console.error('Failed to remove student:', error);
      notify.error('Remove Failed', 'An error occurred while removing the learner.');
    } finally {
      setIsRemoving(false);
    }
  };

  if (activeTab === 'create' || editingTask) {
    return (
      <div className="p-4 lg:p-8">
        <CreateTaskForm
          onSave={async (task) => {
            try {
              await onCreateTask(task);
              setEditingTask(null);
              onNavigate('dashboard');
            } catch (error: any) {
              // Error toast is handled by CreateTaskForm's catch block
              throw error;
            }
          }}
          onCancel={() => {
            setEditingTask(null);
            onNavigate('dashboard');
          }}
          editTask={editingTask}
          onUpdate={(taskId, updates) => {
            onUpdateTask(taskId, updates);
            setEditingTask(null);
            onNavigate('dashboard');
          }}
        />
      </div>
    );
  }

  if (activeTab === 'students') {
    return (
      <div className="p-4 lg:p-8">
        <StudentList
          students={students}
          submissions={submissions}
          onNavigateToReview={onNavigateToReview}
        />
      </div>
    );
  }

  if (activeTab === 'insights') {
    return (
      <div className="p-4 lg:p-8">
        <ClassInsightsView
          students={students}
          submissions={submissions}
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={onSelectTask}
        />
      </div>
    );
  }

  if (activeTab === 'tasks') {
    return (
      <div className="p-4 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">All Tasks</h2>
              <p className="text-sm text-slate-500 mt-1">
                Manage your tasks, organise into folders, and control task availability
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('create')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Task
            </Button>
          </div>

          <div className="flex gap-6">
            {/* Folder Sidebar */}
            <div className="w-64 flex-shrink-0">
              <Card className="sticky top-4">
                <FolderManagement
                  folders={folders}
                  selectedFolderId={selectedFolderId}
                  onCreateFolder={onCreateFolder}
                  onSelectFolder={setSelectedFolderId}
                  onDeleteFolder={onDeleteFolder}
                  onUpdateFolder={onUpdateFolder}
                  onMoveTaskToFolder={onMoveTaskToFolder}
                />
              </Card>
            </div>

            {/* Task List */}
            <div className="flex-1">
              <TaskList
                tasks={tasks}
                submissions={submissions}
                students={students}
                selectedTaskId={selectedTaskId}
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectTask={(taskId) => {
                  onSelectTask(taskId);
                  onNavigate('dashboard');
                }}
                onDeactivateTask={onDeactivateTask}
                onReactivateTask={onReactivateTask}
                onMoveTaskToFolder={onMoveTaskToFolder}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: dashboard view
  const showOverview = activeTab === 'dashboard';

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Task Selector */}
        {tasks.length > 0 && (
          <div className="lg:max-w-md">
            <TaskSelector
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
            />
          </div>
        )}

        {/* Current Task Info */}
        <div className={`bg-white p-4 lg:p-6 rounded-xl border shadow-sm ${
          currentTask?.status === 'inactive' ? 'border-slate-300 bg-slate-50' : 'border-slate-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className={`text-xl lg:text-2xl font-bold mb-2 ${
                currentTask?.status === 'inactive' ? 'text-slate-500' : 'text-slate-900'
              }`}>
                {currentTask?.title || "No Active Task"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-slate-500 text-sm">
                {/* Task Status Badge */}
                {currentTask?.status === 'inactive' ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-200 rounded text-slate-600">
                    <PowerOff className="w-3.5 h-3.5" /> Inactive
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 rounded text-emerald-700">
                    <Power className="w-3.5 h-3.5" /> Live
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Edit Task Button */}
              {currentTask && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTask(currentTask)}
                  leftIcon={<Pencil className="w-4 h-4" />}
                  className="text-slate-600 border-slate-300 hover:bg-slate-50"
                >
                  Edit
                </Button>
              )}
              {/* Quick Toggle for Task Status */}
              {currentTask && (
                <Button
                  variant={currentTask.status === 'inactive' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (currentTask.status === 'inactive') {
                      onReactivateTask(currentTask.id);
                    } else {
                      onDeactivateTask(currentTask.id);
                    }
                  }}
                  leftIcon={currentTask.status === 'inactive' ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  className={currentTask.status !== 'inactive' ? 'text-amber-600 border-amber-300 hover:bg-amber-50' : ''}
                >
                  {currentTask.status === 'inactive' ? 'Activate' : 'Deactivate'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('tasks')}
                leftIcon={<List className="w-4 h-4" />}
              >
                All Tasks
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingTask(null);
                  onNavigate('create');
                }}
                leftIcon={<Plus className="w-4 h-4" />}
                data-tutorial="create-task"
                className="shadow-md shadow-brand-500/20 font-bold"
              >
                New Task
              </Button>
            </div>
          </div>
          {/* Warning Banner for Inactive Task */}
          {currentTask?.status === 'inactive' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>This task is inactive.</strong> Students cannot access it using the task code.
              Click "Activate" to make it available again.
            </div>
          )}
        </div>

        {/* Share Task Card */}
        {currentTask?.taskCode && (
          <ShareTaskCard
            taskCode={currentTask.taskCode}
            isDisabled={currentTask.status === 'inactive'}
          />
        )}

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Active Learners</h3>
            <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-slate-900">{activeStudents}</span>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Live
                </span>
            </div>
        </Card>

        {/* Ready for Feedback - with batch generate button */}
        <Card className="border-purple-200 bg-purple-50" data-tutorial="generate-feedback">
             <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Ready for Feedback</h3>
             <div className="flex items-center justify-between mt-2">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-white text-purple-600 flex items-center justify-center font-bold text-sm shadow-sm">
                     {readyForFeedbackCount}
                   </div>
                   <p className="text-sm text-purple-800 leading-tight">Learners waiting</p>
                 </div>
                 {readyForFeedbackCount > 0 && (
                   <Button
                     size="sm"
                     variant="primary"
                     onClick={handleBatchGenerate}
                     disabled={isBatchGenerating}
                     className="bg-purple-600 hover:bg-purple-700"
                   >
                     {isBatchGenerating ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                       <>
                         <Zap className="w-3 h-3 mr-1" />
                         Generate All ({readyForFeedbackCount})
                       </>
                     )}
                   </Button>
                 )}
             </div>
        </Card>

        {/* Needs Review */}
        <Card className="border-blue-200 bg-blue-50">
             <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Needs Review</h3>
             <div className="flex items-center gap-3 mt-2">
                 <div className="w-8 h-8 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-sm shadow-sm">
                   {taskStudents.filter(s => s.status === 'submitted').length}
                 </div>
                 <p className="text-sm text-blue-800 leading-tight">Feedback ready for approval</p>
             </div>
        </Card>

        {/* Credits Display */}
        <Card className="border-gold-200 bg-gradient-to-br from-gold-50 to-white">
             <h3 className="text-xs font-semibold text-gold-700 uppercase tracking-wide mb-1">Feedback Credits</h3>
             <div className="flex items-end justify-between mt-2">
                 <div>
                   <span className="text-2xl font-bold text-navy-800">{credits.remaining}</span>
                   <span className="text-sm text-gold-600 ml-1">remaining</span>
                 </div>
                 <span className="text-xs text-gold-700 bg-gold-100 px-2 py-1 rounded font-medium">
                   {credits.used} used
                 </span>
             </div>
             {sessionFeedbacksGenerated !== undefined && (
               <div className="text-sm text-slate-600 mt-2">
                 Feedbacks used this session: <span className="font-semibold">{sessionFeedbacksGenerated}</span>
               </div>
             )}
        </Card>
      </div>

      {/* Learner List */}
      <Card noPadding data-tutorial="student-list">
          <div className="px-6 py-4 border-b border-slate-100 bg-navy-800">
            <h3 className="font-semibold text-white">Learner Progress</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-3">Learner Name</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {taskStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                          No learners have joined this task yet. Share the task code to invite learners.
                        </td>
                      </tr>
                    ) : (
                      taskStudents.map((student, index) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors group" data-tutorial={index === 0 ? "remove-student" : undefined}>
                            <td className="px-6 py-4 font-medium text-slate-900">
                              <div className="flex items-center gap-2">
                                {student.name}
                                {onRemoveStudent && (
                                  <button
                                    onClick={() => setStudentToRemove(student)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                    title="Remove Learner"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4"><StatusBadge status={student.status} /></td>
                            <td className="px-6 py-4 text-right">
                                {student.status === 'ready_for_feedback' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setViewingStudentId(student.id)}
                                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="View Response"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleGenerateFeedback(student.id)}
                                      disabled={generatingStudentId === student.id}
                                      className="bg-purple-600 hover:bg-purple-700"
                                    >
                                      {generatingStudentId === student.id ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <Zap className="w-4 h-4 mr-1" />
                                          Generate Feedback
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                                {student.status === 'generating' && (
                                  <span className="text-blue-600 text-xs font-medium flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Generating...
                                  </span>
                                )}
                                {student.status === 'submitted' && (
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => onNavigateToReview(student.id)}
                                    leftIcon={<ClipboardCheck className="w-4 h-4" />}
                                  >
                                    Review
                                  </Button>
                                )}
                                {student.status === 'active' && (
                                  <span className="text-slate-400 text-xs italic">Writing...</span>
                                )}
                                {student.status === 'feedback_ready' && (
                                  <span className="text-emerald-600 text-xs font-medium">Feedback Sent</span>
                                )}
                                {student.status === 'revising' && (
                                  <span className="text-amber-600 text-xs font-medium">Revising work...</span>
                                )}
                                {student.status === 'completed' && (
                                  <span className="text-slate-600 text-xs font-medium">Completed</span>
                                )}
                            </td>
                        </tr>
                      ))
                    )}
                </tbody>
            </table>
          </div>
      </Card>

      {/* Student Response Side Panel - rendered via portal to escape stacking context */}
      {viewingStudentId && (() => {
        const viewingStudent = taskStudents.find(s => s.id === viewingStudentId);
        const viewingSubmission = submissions[viewingStudentId];
        return createPortal(
          <>
            <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={() => setViewingStudentId(null)} />
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col z-[9999]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="font-semibold text-slate-900">{viewingStudent?.name || 'Student'}</h3>
                  <p className="text-xs text-slate-500">Student Response</p>
                </div>
                <button
                  onClick={() => setViewingStudentId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {viewingSubmission?.content ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">
                        {viewingSubmission.content}
                      </p>
                    </div>
                    {viewingSubmission.timestamp && (
                      <p className="text-xs text-slate-500">
                        Submitted: {new Date(viewingSubmission.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No submission content available.</p>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    handleGenerateFeedback(viewingStudentId);
                    setViewingStudentId(null);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  leftIcon={<Zap className="w-4 h-4" />}
                >
                  Generate Feedback
                </Button>
              </div>
            </div>
          </>,
          document.body
        );
      })()}

      {/* Remove Learner Confirmation Modal */}
      {studentToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <UserMinus className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Remove Learner</h3>
              </div>
              <button
                onClick={() => setStudentToRemove(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600">
              Remove <span className="font-semibold">{studentToRemove.name}</span>? This learner will be removed but can rejoin with another name.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStudentToRemove(null)}
                disabled={isRemoving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRemoveStudent}
                disabled={isRemoving}
                className="bg-red-600 hover:bg-red-700"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};