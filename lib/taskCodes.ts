// Task Code Generation and Validation Utilities
// Generates unique 6-digit alphanumeric codes for tasks

import { Task } from '../types';

// Interface for stored task data in global mapping
interface StoredTaskData {
  taskId: string;
  storeKey: string;
  task: {
    id: string;
    title: string;
    prompt: string;
    successCriteria: string[];
    taskCode: string;
    status: 'active' | 'inactive';
    universalExpectations: boolean;
  };
}

/**
 * Generates a 6-digit alphanumeric code
 * Format: ABC123 (uppercase letters and numbers)
 */
export function generateTaskCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

/**
 * Validates if a task code matches the expected format
 * Must be 6 alphanumeric characters
 */
export function isValidTaskCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Must be exactly 6 characters
  if (code.length !== 6) {
    return false;
  }

  // Must only contain alphanumeric characters
  const alphanumericRegex = /^[A-Z0-9]+$/;
  return alphanumericRegex.test(code.toUpperCase());
}

/**
 * Formats a task code for display (adds hyphen in the middle)
 * Example: ABC123 -> ABC-123
 */
export function formatTaskCode(code: string): string {
  if (code.length !== 6) {
    return code;
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Generates a unique task code that doesn't conflict with existing codes
 */
export function generateUniqueTaskCode(existingCodes: string[]): string {
  const maxAttempts = 100;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const code = generateTaskCode();
    if (!existingCodes.includes(code)) {
      return code;
    }
    attempts++;
  }

  // Fallback: append timestamp if we can't generate unique code
  const code = generateTaskCode();
  console.warn('Could not generate unique code after 100 attempts, using timestamp fallback');
  return code;
}

/**
 * Stores task code mapping in localStorage with FULL task data
 * Maps: taskCode -> { taskId, storeKey, task }
 * Task codes are stored GLOBALLY so students can find them regardless of teacher context
 *
 * @param teacherId - Teacher's ID (or undefined for demo)
 * @param taskCode - The 6-digit task code
 * @param task - Full task object to store
 */
export function saveTaskCodeMapping(teacherId: string | undefined, taskCode: string, task: Task): void {
  const globalStorageKey = 'lara-task-codes-global';
  const storeKey = teacherId ? `lara-teacher-${teacherId}` : 'lara-demo-store-v2';

  try {
    const stored = localStorage.getItem(globalStorageKey);
    const mappings = stored ? JSON.parse(stored) : {};

    // Store full task data so students can access without teacher's store
    const storedData: StoredTaskData = {
      taskId: task.id,
      storeKey,
      task: {
        id: task.id,
        title: task.title,
        prompt: task.prompt,
        successCriteria: task.successCriteria,
        taskCode: task.taskCode || taskCode,
        status: task.status,
        universalExpectations: task.universalExpectations
      }
    };

    mappings[taskCode.toUpperCase()] = storedData;

    localStorage.setItem(globalStorageKey, JSON.stringify(mappings));
  } catch (error) {
    console.error('Failed to save task code mapping:', error);
  }
}

/**
 * Gets task info from task code (globally)
 * Returns taskId, storeKey, and full task data
 */
export function getTaskInfoFromCode(taskCode: string): StoredTaskData | null {
  const globalStorageKey = 'lara-task-codes-global';

  try {
    const stored = localStorage.getItem(globalStorageKey);
    if (!stored) {
      return null;
    }

    const mappings = JSON.parse(stored);
    return mappings[taskCode.toUpperCase()] || null;
  } catch (error) {
    console.error('Failed to get task code mapping:', error);
    return null;
  }
}

/**
 * Gets full Task object from task code
 * This is the primary function for student access - no teacher store needed
 */
export function getTaskFromCode(taskCode: string): Task | null {
  const info = getTaskInfoFromCode(taskCode);
  if (!info || !info.task) {
    return null;
  }

  // Return as full Task object with default values for missing fields
  return {
    id: info.task.id,
    title: info.task.title,
    prompt: info.task.prompt,
    successCriteria: info.task.successCriteria,
    taskCode: info.task.taskCode,
    status: info.task.status,
    universalExpectations: info.task.universalExpectations,
    folderId: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Gets task ID from task code (legacy compatibility)
 */
export function getTaskIdFromCode(teacherId: string | undefined, taskCode: string): string | null {
  const info = getTaskInfoFromCode(taskCode);
  return info?.taskId || null;
}

/**
 * Gets all task codes for a teacher
 */
export function getAllTaskCodes(teacherId: string | undefined): Record<string, string> {
  const globalStorageKey = 'lara-task-codes-global';
  const storeKey = teacherId ? `lara-teacher-${teacherId}` : 'lara-demo-store-v2';

  try {
    const stored = localStorage.getItem(globalStorageKey);
    if (!stored) return {};

    const mappings = JSON.parse(stored);
    const result: Record<string, string> = {};

    // Filter to only return codes for this teacher's store
    for (const [code, info] of Object.entries(mappings)) {
      if ((info as any).storeKey === storeKey) {
        result[code] = (info as any).taskId;
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to get all task codes:', error);
    return {};
  }
}
