import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  teacher?: {
    id: string;
    email: string;
    name: string;
    tier: string;
  };
  student?: {
    id: string;
    sessionId: string;
    name: string;
  };
}

export type FeedbackType = 'task' | 'process' | 'self_reg';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  text: string;
  anchors?: string[];
  criterionRef?: number | null; // Links to success criteria index (0-based)
}

export interface NextStep {
  id: string;
  actionVerb: string;
  target: string;
  successIndicator: string;
  reflectionPrompt?: string; // Promotes student agency
  ctaText: string;
  actionType: 'revise' | 'improve_section' | 'reupload' | 'rehearse';
}

export interface FeedbackSession {
  goal: string;
  masteryAchieved?: boolean;
  strengths: FeedbackItem[];
  growthAreas: FeedbackItem[];
  nextSteps: NextStep[];
}

export type StudentStatus =
  | 'active'
  | 'ready_for_feedback'
  | 'generating'
  | 'submitted'
  | 'feedback_ready'
  | 'revising'
  | 'completed';

export interface StudentSessionData {
  id: string;
  name: string;
  joinedAt: number;
  status: StudentStatus;
  submissionId?: string;
}

export interface StudentSubmission {
  studentId: string;
  content: string;
  timestamp: number;
  timeElapsed?: number;
  revisionCount: number;
  previousContent?: string;
  feedback?: FeedbackSession;
  feedbackStatus: 'pending' | 'generated' | 'approved' | 'released';
  validationWarnings: string[];
  selectedNextStepId?: string;
  selectedNextStep?: NextStep;
  isRevision?: boolean;
  detectionResult?: 'aligned' | 'uncertain'; // Revision alignment detection
}

// Tier configuration
export interface TierConfig {
  id: 'starter' | 'classroom' | 'multi_class';
  name: string;
  monthlyAiCalls: number;
  maxStudentsPerSession: number;
  batchGenerationLimit: number;
}

export const TIER_CONFIGS: Record<string, TierConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyAiCalls: 200,
    maxStudentsPerSession: 35,
    batchGenerationLimit: 10,
  },
  classroom: {
    id: 'classroom',
    name: 'Classroom',
    monthlyAiCalls: 800,
    maxStudentsPerSession: 35,
    batchGenerationLimit: 25,
  },
  multi_class: {
    id: 'multi_class',
    name: 'Multi-Class',
    monthlyAiCalls: 2400,
    maxStudentsPerSession: 35,
    batchGenerationLimit: 35,
  },
};
