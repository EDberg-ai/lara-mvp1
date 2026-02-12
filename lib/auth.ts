// Teacher Authentication Utilities
// Uses backend API for authentication with JWT tokens

import { authApi, setToken, clearToken, getToken, clearStudentToken } from './api';
import { disconnectSocket } from './socket';

export interface Teacher {
  id: string;
  email: string;
  name: string;
  tier?: string;
  aiCallsUsed?: number;
  aiCallsLimit?: number;
  aiCallsRemaining?: number;
}

const CURRENT_TEACHER_KEY = 'lara-current-teacher';

// Sign up a new teacher
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
  if (!email || !password || !name) {
    return { success: false, error: 'All fields are required' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  try {
    const response = await authApi.register(email, password, name);
    setToken(response.token);
    const teacher: Teacher = {
      id: response.teacher.id,
      email: response.teacher.email,
      name: response.teacher.name,
      tier: response.teacher.tier,
    };
    setCurrentTeacher(teacher);
    return { success: true, teacher };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
  }
}

// Log in an existing teacher
export async function logIn(
  email: string,
  password: string
): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const response = await authApi.login(email, password);
    setToken(response.token);
    const teacher: Teacher = {
      id: response.teacher.id,
      email: response.teacher.email,
      name: response.teacher.name,
      tier: response.teacher.tier,
    };
    setCurrentTeacher(teacher);
    return { success: true, teacher };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
  }
}

// Log out current teacher
export function logOut(): void {
  clearToken();
  clearStudentToken();
  disconnectSocket();  // Remove stale socket handlers
  localStorage.removeItem(CURRENT_TEACHER_KEY);
  localStorage.removeItem('lara-onboarding-completed');
}

// Set current teacher session
export function setCurrentTeacher(teacher: Teacher): void {
  localStorage.removeItem('lara-onboarding-completed');
  localStorage.setItem(CURRENT_TEACHER_KEY, JSON.stringify(teacher));
}

// Get current logged-in teacher
export function getCurrentTeacher(): Teacher | null {
  const stored = localStorage.getItem(CURRENT_TEACHER_KEY);
  if (!stored) return null;

  // Also check if token exists
  const token = getToken();
  if (!token) {
    localStorage.removeItem(CURRENT_TEACHER_KEY);
    return null;
  }

  return JSON.parse(stored);
}

// Check if a teacher is currently logged in
export function isLoggedIn(): boolean {
  return getCurrentTeacher() !== null && getToken() !== null;
}

// Refresh teacher profile from backend
export async function refreshTeacherProfile(): Promise<Teacher | null> {
  try {
    const response = await authApi.getProfile();
    const teacher: Teacher = {
      id: response.id,
      email: response.email,
      name: response.name,
      tier: response.tier,
      aiCallsUsed: response.aiCallsUsed,
      aiCallsLimit: response.aiCallsLimit,
      aiCallsRemaining: response.aiCallsRemaining,
    };
    setCurrentTeacher(teacher);
    return teacher;
  } catch (error) {
    // Token might be expired
    logOut();
    return null;
  }
}
