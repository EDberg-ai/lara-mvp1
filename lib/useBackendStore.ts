// Backend-connected store for LARA
// Uses API calls instead of localStorage for authenticated teachers

import { useState, useEffect, useCallback } from 'react';
import { Student, Task, FeedbackSession, Submission, NextStep, Folder, TeacherCredits } from '../types';
import { tasksApi, foldersApi, sessionsApi, authApi, setStudentToken, getStudentToken, clearStudentToken, TaskResponse, FolderResponse } from './api';
import { saveTaskCodeMapping } from './taskCodes';

export interface BackendState {
  tasks: Task[];
  students: Student[];
  submissions: Record<string, Submission>;
  currentTaskId: string;
  currentSessionId: string | null;
  selectedNextStep: NextStep | null;
  folders: Folder[];
  credits: TeacherCredits;
  sessionFeedbacksGenerated: number;
  isLoading: boolean;
  error: string | null;
}

// Convert API response to frontend types
function taskResponseToTask(t: TaskResponse): Task {
  return {
    id: t.id,
    title: t.title,
    prompt: t.prompt,
    taskCode: t.taskCode,
    successCriteria: t.successCriteria,
    universalExpectations: t.universalExpectations,
    status: t.status,
    folderId: t.folderId,
    liveSessionId: t.liveSessionId,
    imageUrl: t.imageUrl || undefined,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
  };
}

function folderResponseToFolder(f: FolderResponse): Folder {
  return {
    id: f.id,
    name: f.name,
    description: f.description || undefined,
    color: f.color,
    createdAt: new Date(f.createdAt),
    updatedAt: new Date(f.updatedAt),
  };
}

export function useBackendStore(teacherId?: string) {
  const [state, setState] = useState<BackendState>({
    tasks: [],
    students: [],
    submissions: {},
    currentTaskId: '',
    currentSessionId: null,
    selectedNextStep: null,
    folders: [],
    credits: {
      used: 0,
      remaining: 800,
      monthlyLimit: 800,
    },
    sessionFeedbacksGenerated: 0,
    isLoading: true,
    error: null,
  });

  // Load initial data from backend
  const loadData = useCallback(async () => {
    if (!teacherId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Load tasks and folders in parallel
      const [tasksResponse, foldersResponse, usageResponse] = await Promise.all([
        tasksApi.getAll(),
        foldersApi.getAll(),
        sessionsApi.getUsage(),
      ]);

      const tasks = tasksResponse.map(taskResponseToTask);
      const folders = foldersResponse.map(folderResponseToFolder);

      // Sync task code mappings to localStorage for student access
      tasks.forEach(task => {
        if (task.taskCode) {
          saveTaskCodeMapping(undefined, task.taskCode, task);
        }
      });

      setState(prev => ({
        ...prev,
        tasks,
        folders,
        currentTaskId: tasks[0]?.id || '',
        credits: {
          used: usageResponse.used,
          remaining: usageResponse.remaining,
          monthlyLimit: usageResponse.limit,
        },
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  }, [teacherId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh credits from backend
  const refreshCredits = useCallback(async () => {
    try {
      const usageResponse = await sessionsApi.getUsage();
      setState(prev => ({
        ...prev,
        credits: {
          used: usageResponse.used,
          remaining: usageResponse.remaining,
          monthlyLimit: usageResponse.limit,
        },
      }));
    } catch (error) {
      console.error('Failed to refresh credits:', error);
    }
  }, []);

  // Load session dashboard data
  const loadSessionDashboard = useCallback(async (sessionId: string) => {
    try {
      const dashboard = await sessionsApi.getDashboard(sessionId);

      // Convert students and submissions
      const students: Student[] = dashboard.students.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status as Student['status'],
        joinedAt: s.joinedAt,
        taskId: dashboard.session.taskId,
      }));

      const submissions: Record<string, Submission> = {};
      dashboard.students.forEach(s => {
        if (s.submission) {
          submissions[s.id] = {
            studentId: s.id,
            taskId: dashboard.session.taskId,
            content: s.submission.content,
            feedback: s.submission.feedback as FeedbackSession | undefined,
            timestamp: s.submission.timestamp,
            timeElapsed: s.submission.timeElapsed,
            revisionCount: s.submission.revisionCount,
            previousContent: s.submission.previousContent,
            isRevision: s.submission.isRevision,
            feedbackStatus: s.submission.feedbackStatus,
            validationWarnings: s.submission.validationWarnings,
          };
        }
      });

      setState(prev => ({
        ...prev,
        students,
        submissions,
        currentSessionId: sessionId,
        currentTaskId: dashboard.session.taskId,
        credits: {
          used: dashboard.usage.used,
          remaining: dashboard.usage.remaining,
          monthlyLimit: dashboard.usage.limit,
        },
        sessionFeedbacksGenerated: dashboard.sessionUsage?.feedbacksGenerated || 0,
      }));

      return dashboard;
    } catch (error) {
      console.error('Failed to load session dashboard:', error);
      // Return null for "not found" errors (session expired/deleted)
      if (error instanceof Error && error.message.includes('not found')) {
        setState(prev => ({
          ...prev,
          students: [],
          submissions: {},
          currentSessionId: null,
        }));
        return null;
      }
      throw error;
    }
  }, []);

  // Task operations
  const addTask = async (task: Omit<Task, 'id' | 'taskCode' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await tasksApi.create({
        title: task.title,
        prompt: task.prompt,
        successCriteria: task.successCriteria,
        universalExpectations: task.universalExpectations,
        folderId: task.folderId,
        imageUrl: task.imageUrl,
        fileType: task.fileType,
      });

      const newTask = taskResponseToTask(response);

      // Save task code mapping for student access
      if (newTask.taskCode) {
        saveTaskCodeMapping(undefined, newTask.taskCode, newTask);
      }

      setState(prev => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
        currentTaskId: newTask.id,
      }));

      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await tasksApi.update(taskId, {
        title: updates.title,
        prompt: updates.prompt,
        successCriteria: updates.successCriteria,
        universalExpectations: updates.universalExpectations,
        imageUrl: updates.imageUrl,
        fileType: updates.fileType,
      });

      const updatedTask = taskResponseToTask(response);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? updatedTask : t),
      }));

      return updatedTask;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  const deactivateTask = async (taskId: string) => {
    try {
      await tasksApi.updateStatus(taskId, 'inactive');
      setState(prev => {
        const updatedTasks = prev.tasks.map(t =>
          t.id === taskId ? { ...t, status: 'inactive' as const, updatedAt: new Date() } : t
        );
        // Update localStorage mapping with new status
        const updatedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedTask?.taskCode) {
          saveTaskCodeMapping(undefined, updatedTask.taskCode, updatedTask);
        }
        return { ...prev, tasks: updatedTasks };
      });
    } catch (error) {
      console.error('Failed to deactivate task:', error);
      throw error;
    }
  };

  const reactivateTask = async (taskId: string) => {
    try {
      await tasksApi.updateStatus(taskId, 'active');
      setState(prev => {
        const updatedTasks = prev.tasks.map(t =>
          t.id === taskId ? { ...t, status: 'active' as const, updatedAt: new Date() } : t
        );
        // Update localStorage mapping with new status
        const updatedTask = updatedTasks.find(t => t.id === taskId);
        if (updatedTask?.taskCode) {
          saveTaskCodeMapping(undefined, updatedTask.taskCode, updatedTask);
        }
        return { ...prev, tasks: updatedTasks };
      });
    } catch (error) {
      console.error('Failed to reactivate task:', error);
      throw error;
    }
  };

  // Folder operations
  const createFolder = async (name: string, description?: string, color?: string) => {
    try {
      const response = await foldersApi.create(name, description, color);
      const newFolder = folderResponseToFolder(response);
      setState(prev => ({
        ...prev,
        folders: [...prev.folders, newFolder],
      }));
      return newFolder.id;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  };

  const moveTaskToFolder = async (taskId: string, folderId: string | null) => {
    try {
      await tasksApi.moveToFolder(taskId, folderId);
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === taskId ? { ...t, folderId, updatedAt: new Date() } : t
        ),
      }));
    } catch (error) {
      console.error('Failed to move task:', error);
      throw error;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await foldersApi.delete(folderId);
      setState(prev => ({
        ...prev,
        folders: prev.folders.filter(f => f.id !== folderId),
        tasks: prev.tasks.map(t =>
          t.folderId === folderId ? { ...t, folderId: null, updatedAt: new Date() } : t
        ),
      }));
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  };

  const updateFolder = async (folderId: string, name: string, description?: string, color?: string) => {
    try {
      await foldersApi.update(folderId, name, description, color);
      setState(prev => ({
        ...prev,
        folders: prev.folders.map(f =>
          f.id === folderId ? { ...f, name, description, color: color || f.color, updatedAt: new Date() } : f
        ),
      }));
    } catch (error) {
      console.error('Failed to update folder:', error);
      throw error;
    }
  };

  // Feedback operations
  const generateFeedbackForStudent = async (studentId: string): Promise<boolean> => {
    if (!state.currentSessionId) {
      console.error('No session ID');
      return false;
    }

    try {
      // Update local status to generating
      setState(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status: 'generating' as const } : s
        ),
      }));

      const result = await sessionsApi.generateFeedback(state.currentSessionId, [studentId]);

      if (result.results[0]?.success) {
        // Reload dashboard to get the feedback
        await loadSessionDashboard(state.currentSessionId);
        // Explicitly refresh credits to ensure UI is up-to-date
        await refreshCredits();
        return true;
      } else {
        // Revert status
        setState(prev => ({
          ...prev,
          students: prev.students.map(s =>
            s.id === studentId ? { ...s, status: 'ready_for_feedback' as const } : s
          ),
        }));
        return false;
      }
    } catch (error) {
      console.error('Failed to generate feedback:', error);
      setState(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status: 'ready_for_feedback' as const } : s
        ),
      }));
      return false;
    }
  };

  const generateFeedbackBatch = async (studentIds: string[]): Promise<{ success: number; failed: number }> => {
    if (!state.currentSessionId) {
      return { success: 0, failed: studentIds.length };
    }

    try {
      const result = await sessionsApi.generateFeedback(state.currentSessionId, studentIds);

      // Reload dashboard to get the feedback
      await loadSessionDashboard(state.currentSessionId);
      // Explicitly refresh credits to ensure UI is up-to-date
      await refreshCredits();

      return {
        success: result.generated,
        failed: result.failed,
      };
    } catch (error) {
      console.error('Failed to generate batch feedback:', error);
      return { success: 0, failed: studentIds.length };
    }
  };

  const approveFeedback = async (studentId: string) => {
    if (!state.currentSessionId) return;

    try {
      await sessionsApi.approveFeedback(state.currentSessionId, studentId);

      setState(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId
            ? { ...s, status: 'feedback_ready' as const }
            : s
        ),
      }));
    } catch (error) {
      console.error('Failed to approve feedback:', error);
      throw error;
    }
  };

  const updateFeedback = async (studentId: string, updatedFeedback: FeedbackSession) => {
    if (!state.currentSessionId) return;

    try {
      await sessionsApi.editFeedback(state.currentSessionId, studentId, updatedFeedback);

      setState(prev => ({
        ...prev,
        submissions: {
          ...prev.submissions,
          [studentId]: {
            ...prev.submissions[studentId],
            feedback: updatedFeedback,
          },
        },
      }));
    } catch (error) {
      console.error('Failed to update feedback:', error);
      throw error;
    }
  };

  const regenerateFeedback = async (studentId: string): Promise<boolean> => {
    return generateFeedbackForStudent(studentId);
  };

  // Other state operations
  const selectTask = async (taskId: string) => {
    setState(prev => ({ ...prev, currentTaskId: taskId }));

    // Find the task and load session data if it has a live session
    const task = state.tasks.find(t => t.id === taskId);
    if (task?.liveSessionId) {
      try {
        await loadSessionDashboard(task.liveSessionId);
      } catch (error) {
        console.error('Failed to load session dashboard:', error);
      }
    } else {
      // Clear students/submissions when no live session
      setState(prev => ({
        ...prev,
        students: [],
        submissions: {},
        currentSessionId: null,
      }));
    }
  };

  const setSelectedNextStep = (step: NextStep | null) => {
    setState(prev => ({ ...prev, selectedNextStep: step }));
  };

  const getStudentStatus = (studentId: string) => {
    return state.students.find(s => s.id === studentId)?.status;
  };

  const resetDemo = () => {
    // For backend mode, just reload
    loadData();
  };

  // Placeholder methods that work locally (for compatibility)
  const addStudent = (name: string): Student => {
    const newStudent: Student = {
      id: `local-${Date.now()}`,
      name,
      status: 'active',
      joinedAt: Date.now(),
    };
    setState(prev => ({
      ...prev,
      students: [...prev.students, newStudent],
    }));
    return newStudent;
  };

  // Add or update a student with specific ID (for session restoration)
  const restoreStudent = (studentId: string, name: string, status: Student['status']): Student => {
    const student: Student = {
      id: studentId,
      name,
      status,
      joinedAt: Date.now(),
    };
    setState(prev => {
      const existingIndex = prev.students.findIndex(s => s.id === studentId);
      if (existingIndex >= 0) {
        const updatedStudents = [...prev.students];
        updatedStudents[existingIndex] = { ...updatedStudents[existingIndex], ...student };
        return { ...prev, students: updatedStudents };
      } else {
        return { ...prev, students: [...prev.students, student] };
      }
    });
    return student;
  };

  const submitWork = (studentId: string, taskId: string, content: string, feedback: FeedbackSession | null, timeElapsed?: number) => {
    setState(prev => {
      const existingSubmission = prev.submissions[studentId];
      // Preserve existing content if new content is empty (e.g., when adding feedback)
      const finalContent = content || existingSubmission?.content || '';

      return {
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status: feedback ? 'submitted' : 'ready_for_feedback' } : s
        ),
        submissions: {
          ...prev.submissions,
          [studentId]: {
            studentId,
            taskId,
            content: finalContent,
            feedback,
            timestamp: Date.now(),
            timeElapsed: timeElapsed ?? existingSubmission?.timeElapsed,
            revisionCount: existingSubmission?.revisionCount || 0,
          },
        },
      };
    });
  };

  const saveSelectedNextStep = (studentId: string, step: NextStep) => {
    setState(prev => ({
      ...prev,
      submissions: {
        ...prev.submissions,
        [studentId]: {
          ...prev.submissions[studentId],
          selectedNextStepId: step.id,
          selectedNextStep: step,
        },
      },
      students: prev.students.map(s =>
        s.id === studentId ? { ...s, status: 'revising' as const } : s
      ),
    }));
  };

  const submitRevision = (studentId: string, taskId: string, newContent: string, timeElapsed?: number) => {
    setState(prev => {
      const existingSubmission = prev.submissions[studentId];
      const currentRevisionCount = existingSubmission?.revisionCount || 0;

      if (currentRevisionCount >= 3) return prev;

      return {
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status: 'ready_for_feedback' as const } : s
        ),
        submissions: {
          ...prev.submissions,
          [studentId]: {
            studentId,
            taskId,
            content: newContent,
            feedback: null,
            timestamp: Date.now(),
            timeElapsed,
            revisionCount: currentRevisionCount + 1,
            previousContent: existingSubmission?.content,
            selectedNextStepId: existingSubmission?.selectedNextStepId,
            selectedNextStep: existingSubmission?.selectedNextStep,
            isRevision: true,
          },
        },
      };
    });
  };

  const markAsCompleted = (studentId: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s =>
        s.id === studentId ? { ...s, status: 'completed' as const } : s
      ),
    }));
  };

  // Update a task's liveSessionId (used when a student creates a new session)
  const updateTaskLiveSessionId = (taskId: string, sessionId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId && !t.liveSessionId
          ? { ...t, liveSessionId: sessionId }
          : t
      ),
    }));
  };

  // Add student directly from WebSocket payload (optimistic update for instant UI)
  const addStudentFromWebSocket = useCallback((student: {
    id: string;
    name: string;
    sessionId: string;
    taskId: string;
  }) => {
    setState(prev => {
      // Check if student already exists
      if (prev.students.some(s => s.id === student.id)) {
        return prev;
      }

      return {
        ...prev,
        students: [...prev.students, {
          id: student.id,
          name: student.name,
          status: 'active' as const,
          joinedAt: Date.now(),
          taskId: student.taskId,
        }],
      };
    });
  }, []);

  // Update student status from WebSocket (for submissions - optimistic update)
  const updateStudentFromWebSocket = useCallback((update: {
    studentId: string;
    status?: Student['status'];
  }) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s =>
        s.id === update.studentId
          ? { ...s, status: update.status || s.status }
          : s
      ),
    }));
  }, []);

  // Remove a student from the session
  const removeStudent = (studentId: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.filter(s => s.id !== studentId),
      // Also remove their submission
      submissions: Object.fromEntries(
        Object.entries(prev.submissions).filter(([id]) => id !== studentId)
      )
    }));
  };

  return {
    state,
    addTask,
    updateTask,
    addStudent,
    restoreStudent,
    submitWork,
    approveFeedback,
    updateFeedback,
    getStudentStatus,
    selectTask,
    resetDemo,
    setSelectedNextStep,
    saveSelectedNextStep,
    submitRevision,
    markAsCompleted,
    deactivateTask,
    reactivateTask,
    createFolder,
    moveTaskToFolder,
    deleteFolder,
    updateFolder,
    generateFeedbackForStudent,
    generateFeedbackBatch,
    regenerateFeedback,
    loadSessionDashboard,
    loadData,
    updateTaskLiveSessionId,
    addStudentFromWebSocket,
    updateStudentFromWebSocket,
    removeStudent,
    refreshCredits,
  };
}
