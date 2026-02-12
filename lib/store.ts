import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Student, Task, FeedbackSession, Submission, NextStep, Folder, TeacherCredits } from '../types';
import { generateUniqueTaskCode, saveTaskCodeMapping, getAllTaskCodes } from './taskCodes';
import { generateFeedback } from './gemini';

// Universal Learning Expectations - LARA standard criteria
const UNIVERSAL_LEARNING_EXPECTATIONS = [
  "Clarity of response - Is the answer clear and easy to understand?",
  "Use of evidence and/or examples - Does the response include relevant evidence or examples?",
  "Reasoning and explanation - Is the thinking process explained?",
  "Organisation - Is the response well-structured?",
  "Language for audience and purpose - Is the language appropriate?"
];

// Initial Mock Data
const INITIAL_TASKS: Task[] = [
  {
    id: 'default-task',
    title: 'Creative Writing 101: The Forest',
    prompt: 'Write a descriptive paragraph about walking through a mysterious forest. Focus on sensory details (sight, sound, smell).',
    successCriteria: [
      'Include at least 3 distinct sensory details',
      'Use strong adjectives',
      'Create a clear mood or atmosphere'
    ],
    universalExpectations: true,
    status: 'active',
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export interface AppState {
  tasks: Task[];
  students: Student[];
  submissions: Record<string, Submission>;
  currentTaskId: string;
  currentSessionId: string | null;
  selectedNextStep: NextStep | null;
  folders: Folder[];
  credits: TeacherCredits;
  sessionFeedbacksGenerated: number;
}

// Get storage key for a teacher (or demo mode)
function getStorageKey(teacherId?: string): string {
  if (!teacherId) {
    return 'lara-demo-store-v2'; // Demo mode
  }
  return `lara-teacher-${teacherId}`;
}

export function useAppStore(teacherId?: string) {
  const storageKey = getStorageKey(teacherId);

  const [state, setState] = useState<AppState>(() => {
    const defaultState: AppState = {
      tasks: INITIAL_TASKS,
      students: [],
      submissions: {},
      currentTaskId: 'default-task',
      currentSessionId: null,
      selectedNextStep: null,
      folders: [],
      credits: {
        used: 0,
        remaining: 800,
        monthlyLimit: 800
      },
      sessionFeedbacksGenerated: 0
    };

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle missing fields from old localStorage data
        return {
          ...defaultState,
          ...parsed,
          // Ensure folders is always an array (for old data without folders)
          folders: parsed.folders || [],
          // Ensure credits is always present (for old data without credits)
          credits: parsed.credits || defaultState.credits,
          // Ensure new fields have defaults
          currentSessionId: parsed.currentSessionId || null,
          sessionFeedbacksGenerated: parsed.sessionFeedbacksGenerated || 0
        };
      }
    } catch (e) {
      console.error("Failed to load store", e);
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const addTask = (task: Task) => {
    // Ensure new required fields are set
    const now = new Date();
    const taskWithDefaults: Task = {
      ...task,
      status: task.status || 'active',
      createdAt: task.createdAt || now,
      updatedAt: task.updatedAt || now,
      folderId: task.folderId || null
    };

    // Generate unique task code if not provided
    if (!taskWithDefaults.taskCode) {
      const existingCodes = getAllTaskCodes(teacherId);
      const taskCode = generateUniqueTaskCode(Object.keys(existingCodes));
      taskWithDefaults.taskCode = taskCode;
    }

    // Save full task data to global mapping for student access
    saveTaskCodeMapping(teacherId, taskWithDefaults.taskCode, taskWithDefaults);

    setState(prev => ({
      ...prev,
      tasks: [taskWithDefaults, ...prev.tasks],
      currentTaskId: taskWithDefaults.id
    }));
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setState(prev => {
      const updatedTasks = prev.tasks.map(task =>
        task.id === taskId
          ? { ...task, ...updates, updatedAt: new Date() }
          : task
      );

      // Update global mapping if task has a code
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      if (updatedTask?.taskCode) {
        saveTaskCodeMapping(teacherId, updatedTask.taskCode, updatedTask);
      }

      return { ...prev, tasks: updatedTasks };
    });
  };

  const addStudent = (name: string): Student => {
    const newStudent: Student = {
      id: uuidv4(),
      name,
      status: 'active',
      joinedAt: Date.now()
    };
    setState(prev => ({
      ...prev,
      students: [...prev.students, newStudent]
    }));
    return newStudent;
  };

  // Add or update a student with specific ID (for session restoration)
  const restoreStudent = (studentId: string, name: string, status: Student['status']): Student => {
    const student: Student = {
      id: studentId,
      name,
      status,
      joinedAt: Date.now()
    };
    setState(prev => {
      const existingIndex = prev.students.findIndex(s => s.id === studentId);
      if (existingIndex >= 0) {
        // Update existing student
        const updatedStudents = [...prev.students];
        updatedStudents[existingIndex] = { ...updatedStudents[existingIndex], ...student };
        return { ...prev, students: updatedStudents };
      } else {
        // Add new student
        return { ...prev, students: [...prev.students, student] };
      }
    });
    return student;
  };

  // Submit work without feedback - teacher will generate later
  const submitWork = (studentId: string, taskId: string, content: string, feedback: FeedbackSession | null, timeElapsed?: number) => {
    setState(prev => {
      const existingSubmission = prev.submissions[studentId];
      // Preserve existing content if new content is empty (e.g., when adding feedback)
      const finalContent = content || existingSubmission?.content || '';

      return {
        ...prev,
        // If no feedback, status is 'ready_for_feedback', otherwise 'submitted'
        students: prev.students.map(s => s.id === studentId ? { ...s, status: feedback ? 'submitted' : 'ready_for_feedback' } : s),
        submissions: {
          ...prev.submissions,
          [studentId]: {
            studentId,
            taskId,
            content: finalContent,
            feedback,
            timestamp: Date.now(),
            timeElapsed: timeElapsed ?? existingSubmission?.timeElapsed,
            revisionCount: existingSubmission?.revisionCount || 0
          }
        }
      };
    });
  };

  const approveFeedback = (studentId: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s =>
        s.id === studentId
          ? { ...s, status: 'feedback_ready' as const }
          : s
      ),
    }));
  };

  const updateFeedback = (studentId: string, updatedFeedback: FeedbackSession) => {
    setState(prev => ({
      ...prev,
      submissions: {
        ...prev.submissions,
        [studentId]: {
          ...prev.submissions[studentId],
          feedback: updatedFeedback
        }
      }
    }));
  };

  const getStudentStatus = (studentId: string) => {
    const student = state.students.find(s => s.id === studentId);
    return student?.status;
  };

  const selectTask = (taskId: string) => {
    setState(prev => ({
      ...prev,
      currentTaskId: taskId
    }));
  };

  const resetDemo = () => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem('lara-task-codes-global'); // Also clear global task codes
    sessionStorage.removeItem('lara-demo-mode'); // Clear demo mode session
    window.location.reload();
  };

  const setSelectedNextStep = (step: NextStep | null) => {
    setState(prev => ({
      ...prev,
      selectedNextStep: step
    }));
  };

  // Store selected next step in student's submission
  const saveSelectedNextStep = (studentId: string, step: NextStep) => {
    setState(prev => ({
      ...prev,
      submissions: {
        ...prev.submissions,
        [studentId]: {
          ...prev.submissions[studentId],
          selectedNextStepId: step.id,
          selectedNextStep: step
        }
      },
      // Also update student status to 'revising'
      students: prev.students.map(s =>
        s.id === studentId ? { ...s, status: 'revising' as const } : s
      )
    }));
  };

  // Submit a revision (max 3 revisions allowed)
  // MVP1: Revisions are saved but no AI feedback is generated (deferred feature)
  const submitRevision = (
    studentId: string,
    taskId: string,
    newContent: string,
    timeElapsed?: number
  ) => {
    setState(prev => {
      const existingSubmission = prev.submissions[studentId];
      const previousContent = existingSubmission?.content || '';
      const currentRevisionCount = existingSubmission?.revisionCount || 0;

      // Enforce max 3 revisions
      if (currentRevisionCount >= 3) {
        console.warn('Max revisions (3) reached for student:', studentId);
        return prev; // Don't update state
      }

      return {
        ...prev,
        // Set to 'ready_for_feedback' - teacher will generate when ready
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status: 'ready_for_feedback' as const } : s
        ),
        submissions: {
          ...prev.submissions,
          [studentId]: {
            studentId,
            taskId,
            content: newContent,
            feedback: null, // No feedback until teacher generates
            timestamp: Date.now(),
            timeElapsed,
            revisionCount: currentRevisionCount + 1,
            previousContent,
            selectedNextStepId: existingSubmission?.selectedNextStepId,
            selectedNextStep: existingSubmission?.selectedNextStep,
            isRevision: true
          }
        }
      };
    });
  };

  const deactivateTask = (taskId: string) => {
    setState(prev => {
      const updatedTasks = prev.tasks.map(task =>
        task.id === taskId
          ? { ...task, status: 'inactive' as const, updatedAt: new Date() }
          : task
      );

      // Update global mapping with new status
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      if (updatedTask?.taskCode) {
        saveTaskCodeMapping(teacherId, updatedTask.taskCode, updatedTask);
      }

      return { ...prev, tasks: updatedTasks };
    });
  };

  const reactivateTask = (taskId: string) => {
    setState(prev => {
      const updatedTasks = prev.tasks.map(task =>
        task.id === taskId
          ? { ...task, status: 'active' as const, updatedAt: new Date() }
          : task
      );

      // Update global mapping with new status
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      if (updatedTask?.taskCode) {
        saveTaskCodeMapping(teacherId, updatedTask.taskCode, updatedTask);
      }

      return { ...prev, tasks: updatedTasks };
    });
  };

  const createFolder = (name: string, description?: string, color?: string): string => {
    const folder: Folder = {
      id: uuidv4(),
      name,
      description,
      color: color || '#3b82f6',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setState(prev => ({
      ...prev,
      folders: [...prev.folders, folder]
    }));

    return folder.id;
  };

  const moveTaskToFolder = (taskId: string, folderId: string | null) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === taskId
          ? { ...task, folderId, updatedAt: new Date() }
          : task
      )
    }));
  };

  const deleteFolder = (folderId: string) => {
    setState(prev => ({
      ...prev,
      // Remove folder
      folders: prev.folders.filter(f => f.id !== folderId),
      // Reset tasks in this folder to no folder
      tasks: prev.tasks.map(task =>
        task.folderId === folderId
          ? { ...task, folderId: null, updatedAt: new Date() }
          : task
      )
    }));
  };

  const updateFolder = (folderId: string, name: string, description?: string, color?: string) => {
    setState(prev => ({
      ...prev,
      folders: prev.folders.map(folder =>
        folder.id === folderId
          ? { ...folder, name, description, color: color || folder.color, updatedAt: new Date() }
          : folder
      )
    }));
  };

  // Mark student as completed (when they click "I'm Done" after mastery)
  const markAsCompleted = (studentId: string) => {
    setState(prev => ({
      ...prev,
      students: prev.students.map(s =>
        s.id === studentId ? { ...s, status: 'completed' as const } : s
      )
    }));
  };

  // Generate feedback for a single student (teacher-initiated)
  const generateFeedbackForStudent = async (studentId: string): Promise<boolean> => {
    const submission = state.submissions[studentId];
    const task = state.tasks.find(t => t.id === submission?.taskId);

    if (!submission || !task) {
      console.error('No submission or task found for student:', studentId);
      return false;
    }

    // Set status to 'generating'
    setState(prev => ({
      ...prev,
      students: prev.students.map(s =>
        s.id === studentId ? { ...s, status: 'generating' as const } : s
      )
    }));

    try {
      // Determine which criteria to use - ULE or custom
      const criteriaToUse = task.universalExpectations
        ? UNIVERSAL_LEARNING_EXPECTATIONS
        : task.successCriteria;

      // Generate feedback using AI
      const feedback = await generateFeedback(task.prompt, criteriaToUse, submission.content);

      // Update submission with feedback and set status to 'submitted'
      setState(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status: 'submitted' as const } : s
        ),
        submissions: {
          ...prev.submissions,
          [studentId]: {
            ...prev.submissions[studentId],
            feedback
          }
        },
        // Increment credits used
        credits: {
          ...prev.credits,
          used: prev.credits.used + 1,
          remaining: prev.credits.remaining - 1
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to generate feedback:', error);
      // Revert status back to ready_for_feedback
      setState(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status: 'ready_for_feedback' as const } : s
        )
      }));
      return false;
    }
  };

  // Batch generate feedback for multiple students
  const generateFeedbackBatch = async (studentIds: string[]): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const studentId of studentIds) {
      const result = await generateFeedbackForStudent(studentId);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  };

  // Regenerate feedback for a student (uses 1 credit)
  const regenerateFeedback = async (studentId: string): Promise<boolean> => {
    const submission = state.submissions[studentId];
    const task = state.tasks.find(t => t.id === submission?.taskId);

    if (!submission || !task) {
      console.error('No submission or task found for student:', studentId);
      return false;
    }

    try {
      // Determine which criteria to use - ULE or custom
      const criteriaToUse = task.universalExpectations
        ? UNIVERSAL_LEARNING_EXPECTATIONS
        : task.successCriteria;

      // Generate new feedback
      const feedback = await generateFeedback(task.prompt, criteriaToUse, submission.content);

      // Update submission with new feedback
      setState(prev => ({
        ...prev,
        submissions: {
          ...prev.submissions,
          [studentId]: {
            ...prev.submissions[studentId],
            feedback
          }
        },
        // Increment credits used
        credits: {
          ...prev.credits,
          used: prev.credits.used + 1,
          remaining: prev.credits.remaining - 1
        }
      }));

      return true;
    } catch (error) {
      console.error('Failed to regenerate feedback:', error);
      return false;
    }
  };

  // No-op for local store (backend only feature)
  const loadSessionDashboard = async (_sessionId: string) => {
    // Local store doesn't support session dashboards
  };

  // No-op for local store (backend only feature)
  const loadData = async () => {
    // Local store loads from localStorage automatically
  };

  // No-op for local store (backend only feature)
  const updateTaskLiveSessionId = (_taskId: string, _sessionId: string) => {
    // Local store doesn't use live sessions
  };

  // No-op for local store (backend only feature - WebSocket optimistic updates)
  const addStudentFromWebSocket = (_student: {
    id: string;
    name: string;
    sessionId: string;
    taskId: string;
  }) => {
    // Local store doesn't use WebSocket updates
  };

  // No-op for local store (backend only feature - WebSocket optimistic updates)
  const updateStudentFromWebSocket = (_update: {
    studentId: string;
    status?: Student['status'];
  }) => {
    // Local store doesn't use WebSocket updates
  };

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
  };
}