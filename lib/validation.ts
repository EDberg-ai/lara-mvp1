import { FeedbackSession, FeedbackItem, NextStep } from '../types';

export type WarningSeverity = 'strong' | 'soft';


export interface FeedbackWarning {
  id: string;
  type: 'ability_praise' | 'peer_comparison' | 'invented_criteria' | 'vague_comment' | 'missing_feedback_types' | 'low_specificity' | 'missing_anchors' | 'excessive_feedback_count' | 'missing_reflection' | 'no_strengths' | 'cta_too_long';
  severity: WarningSeverity;
  title: string;
  description: string;
  location?: string; // e.g., "Strength #1", "Growth Area #2"
  matchedText?: string; // The problematic text that triggered the warning
}

// Patterns for detecting ability praise (fixed mindset language)
const ABILITY_PRAISE_PATTERNS = [
  /you('re| are) (so |very |really )?(smart|brilliant|talented|gifted|clever|genius)/i,
  /such a (smart|brilliant|talented|gifted|clever) (student|writer|thinker)/i,
  /natural (talent|ability|gift)/i,
  /born to (write|learn|succeed)/i,
  /you('re| are) a natural/i,
];

// Patterns for detecting peer comparison
const PEER_COMPARISON_PATTERNS = [
  /better than (other|most|many|your) (students|classmates|peers)/i,
  /top (student|performer|of the class)/i,
  /ahead of (your |the )?(class|peers|others)/i,
  /one of the best/i,
  /compared to (other|your) (students|classmates)/i,
  /outperform(ed|ing|s)? (your |other )?(peers|classmates)/i,
];

// Patterns for detecting vague/unhelpful comments
const VAGUE_COMMENT_PATTERNS = [
  /^good (job|work|effort)\.?$/i,
  /^(nice|great|excellent) (work|job|effort)\.?$/i,
  /^well done\.?$/i,
  /add more detail/i,
  /needs (more )?work/i,
  /try harder/i,
  /be more specific/i,
  /could be better/i,
  /needs improvement/i,
];

/**
 * Check a text string against an array of regex patterns
 */
function matchesPatterns(text: string, patterns: RegExp[]): { matches: boolean; matchedText?: string } {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { matches: true, matchedText: match[0] };
    }
  }
  return { matches: false };
}

/**
 * Check for ability praise (fixed mindset language)
 */
function checkAbilityPraise(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  // Check strengths
  feedback.strengths.forEach((item, index) => {
    const result = matchesPatterns(item.text, ABILITY_PRAISE_PATTERNS);
    if (result.matches) {
      warnings.push({
        id: `ability-praise-strength-${index}`,
        type: 'ability_praise',
        severity: 'strong',
        title: 'Ability Praise Detected',
        description: 'This feedback praises innate ability rather than effort or strategy. Research shows this can harm student motivation.',
        location: `Strength #${index + 1}`,
        matchedText: result.matchedText,
      });
    }
  });

  // Check growth areas
  feedback.growthAreas.forEach((item, index) => {
    const result = matchesPatterns(item.text, ABILITY_PRAISE_PATTERNS);
    if (result.matches) {
      warnings.push({
        id: `ability-praise-growth-${index}`,
        type: 'ability_praise',
        severity: 'strong',
        title: 'Ability Praise Detected',
        description: 'This feedback praises innate ability rather than effort or strategy. Research shows this can harm student motivation.',
        location: `Growth Area #${index + 1}`,
        matchedText: result.matchedText,
      });
    }
  });

  return warnings;
}

/**
 * Check for peer comparison language
 */
function checkPeerComparison(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  const allItems = [
    ...feedback.strengths.map((item, i) => ({ item, location: `Strength #${i + 1}` })),
    ...feedback.growthAreas.map((item, i) => ({ item, location: `Growth Area #${i + 1}` })),
  ];

  allItems.forEach(({ item, location }) => {
    const result = matchesPatterns(item.text, PEER_COMPARISON_PATTERNS);
    if (result.matches) {
      warnings.push({
        id: `peer-comparison-${location.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        type: 'peer_comparison',
        severity: 'strong',
        title: 'Peer Comparison Detected',
        description: 'Feedback should focus on the student\'s own progress, not comparison to others.',
        location,
        matchedText: result.matchedText,
      });
    }
  });

  return warnings;
}

/**
 * Check for vague/unhelpful comments
 */
function checkVagueComments(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  const allItems = [
    ...feedback.strengths.map((item, i) => ({ item, location: `Strength #${i + 1}` })),
    ...feedback.growthAreas.map((item, i) => ({ item, location: `Growth Area #${i + 1}` })),
  ];

  allItems.forEach(({ item, location }) => {
    const result = matchesPatterns(item.text, VAGUE_COMMENT_PATTERNS);
    if (result.matches) {
      warnings.push({
        id: `vague-comment-${location.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        type: 'vague_comment',
        severity: 'soft',
        title: 'Vague Comment',
        description: 'This feedback is too general. Consider adding specific examples or actionable guidance.',
        location,
        matchedText: result.matchedText,
      });
    }
  });

  return warnings;
}

/**
 * Check for missing feedback types (should have task, process, and self-regulation)
 */
function checkMissingFeedbackTypes(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  const allItems = [...feedback.strengths, ...feedback.growthAreas];
  const types = new Set(allItems.map(item => item.type));

  const missingTypes: string[] = [];
  if (!types.has('task')) missingTypes.push('task');
  if (!types.has('process')) missingTypes.push('process');
  if (!types.has('self_reg')) missingTypes.push('self-regulation');

  if (missingTypes.length > 0) {
    const presentTypes = ['task', 'process', 'self_reg'].filter(t => types.has(t as any));
    const presentLabels: Record<string, string> = { task: 'Task (what the student wrote)', process: 'Process (how the student explained it)', self_reg: 'Self-management' };
    const presentNames = presentTypes.map(t => presentLabels[t] || t);

    let coachingLine = '';
    if (presentNames.length > 0) {
      coachingLine = ` Your feedback already covers ${presentNames.join(' and ')}. You could add one short prompt that helps the student plan their next attempt or check their work.`;
    }

    warnings.push({
      id: 'missing-feedback-types',
      type: 'missing_feedback_types',
      severity: 'soft',
      title: 'Incomplete Feedback Balance',
      description: `Research-informed balanced feedback suggests considering all three areas: Task (what the student wrote and how well it answers the question), Process (how the student explained, structured, or reasoned), Self-management (how the student can monitor, improve, or apply it next time).${coachingLine}`,
    });
  }

  return warnings;
}

/**
 * Check for low specificity (no content anchors)
 */
function checkLowSpecificity(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  // Check if any items lack anchors (quotes from student work)
  const itemsWithoutAnchors = [
    ...feedback.strengths.filter(item => !item.anchors || item.anchors.length === 0),
    ...feedback.growthAreas.filter(item => !item.anchors || item.anchors.length === 0),
  ];

  // Only warn if most items lack anchors
  const totalItems = feedback.strengths.length + feedback.growthAreas.length;
  const itemsWithAnchors = totalItems - itemsWithoutAnchors.length;

  if (totalItems > 0 && itemsWithAnchors / totalItems < 0.5) {
    warnings.push({
      id: 'low-specificity',
      type: 'low_specificity',
      severity: 'soft',
      title: 'Low Specificity',
      description: 'Most feedback items lack specific references to the student\'s work. Adding quotes or examples makes feedback more actionable.',
    });
  }

  return warnings;
}

/**
 * Check for missing anchors in feedback items
 */
function checkMissingAnchors(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  // Check strengths
  feedback.strengths.forEach((item, index) => {
    if (!item.anchors || item.anchors.length === 0) {
      warnings.push({
        id: `missing-anchors-strength-${index}`,
        type: 'missing_anchors',
        severity: 'soft',
        title: 'Missing Evidence',
        description: 'This strength lacks a direct quote from the student\'s work. Adding an anchor makes feedback more specific.',
        location: `Strength #${index + 1}`,
      });
    }
  });

  // Check growth areas
  feedback.growthAreas.forEach((item, index) => {
    if (!item.anchors || item.anchors.length === 0) {
      warnings.push({
        id: `missing-anchors-growth-${index}`,
        type: 'missing_anchors',
        severity: 'soft',
        title: 'Missing Evidence',
        description: 'This growth area lacks a direct quote from the student\'s work. Adding an anchor helps the student understand where to focus.',
        location: `Growth Area #${index + 1}`,
      });
    }
  });

  return warnings;
}

/**
 * Check for excessive feedback count (should be max 3 strengths, 2 growth areas, 2 next steps)
 */
function checkExcessiveCount(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  if (feedback.strengths.length > 3) {
    warnings.push({
      id: 'excessive-strengths',
      type: 'excessive_feedback_count',
      severity: 'soft',
      title: 'Too Many Strengths',
      description: `Found ${feedback.strengths.length} strengths. Consider limiting to 2-3 high-impact items for better focus.`,
    });
  }

  if (feedback.growthAreas.length > 2) {
    warnings.push({
      id: 'excessive-growth-areas',
      type: 'excessive_feedback_count',
      severity: 'soft',
      title: 'Too Many Growth Areas',
      description: `Found ${feedback.growthAreas.length} growth areas. Consider limiting to 1-2 high-leverage improvements.`,
    });
  }

  if (feedback.nextSteps.length > 3) {
    warnings.push({
      id: 'excessive-next-steps',
      type: 'excessive_feedback_count',
      severity: 'soft',
      title: 'Too Many Next Steps',
      description: `Found ${feedback.nextSteps.length} next steps. Consider limiting to 2-3 actionable steps.`,
    });
  }

  return warnings;
}

/**
 * Check for missing reflection prompts in next steps
 */
function checkMissingReflection(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  feedback.nextSteps.forEach((step, index) => {
    if (!step.reflectionPrompt) {
      warnings.push({
        id: `missing-reflection-${index}`,
        type: 'missing_reflection',
        severity: 'soft',
        title: 'Missing Reflection Prompt',
        description: 'This next step lacks a reflection prompt to encourage student metacognition.',
        location: `Next Step #${index + 1}`,
      });
    }
  });

  return warnings;
}

/**
 * Check if feedback has no strengths (violates emotional safety)
 */
function checkNoStrengths(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  if (feedback.strengths.length === 0) {
    warnings.push({
      id: 'no-strengths',
      type: 'no_strengths',
      severity: 'strong',
      title: 'No Strengths Identified',
      description: 'Feedback must include at least one strength to maintain emotional safety and encourage the student.',
    });
  }

  return warnings;
}

/**
 * Check for CTA text that is too long
 */
function checkCtaTooLong(feedback: FeedbackSession): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  feedback.nextSteps.forEach((step, index) => {
    if (step.ctaText && step.ctaText.length > 40) {
      warnings.push({
        id: `cta-too-long-${index}`,
        type: 'cta_too_long',
        severity: 'soft',
        title: 'CTA Text Too Long',
        description: `Button text is ${step.ctaText.length} characters. Should be ≤40 for mobile display.`,
        location: `Next Step #${index + 1}`,
        matchedText: step.ctaText,
      });
    }
  });

  return warnings;
}

/**
 * Check for invented criteria (criteria not in the original success criteria)
 * This requires the original success criteria to be passed in
 */
function checkInventedCriteria(feedback: FeedbackSession, successCriteria: string[]): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  // Normalize success criteria for comparison
  const normalizedCriteria = successCriteria.map(c => c.toLowerCase());

  // Check if feedback mentions criteria not in the original list
  // This is a heuristic - we look for feedback that seems to evaluate against unstated criteria
  const suspiciousPatterns = [
    /you (should|need to|must) (have |also )?(include|add|mention)/i,
    /missing (a |the )?(key |important |critical )?(element|component|aspect)/i,
    /didn't (include|add|mention|address)/i,
  ];

  feedback.growthAreas.forEach((item, index) => {
    // Check if this growth area references something not in criteria
    let matchesCriteria = false;
    for (const criterion of normalizedCriteria) {
      // Simple check: does the feedback text overlap significantly with any criterion?
      const criterionWords = criterion.split(/\s+/).filter(w => w.length > 3);
      const feedbackLower = item.text.toLowerCase();
      const overlap = criterionWords.filter(word => feedbackLower.includes(word));
      if (overlap.length >= 2 || (criterionWords.length <= 2 && overlap.length >= 1)) {
        matchesCriteria = true;
        break;
      }
    }

    // If it doesn't match criteria and uses suspicious language, warn
    if (!matchesCriteria) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(item.text)) {
          warnings.push({
            id: `invented-criteria-growth-${index}`,
            type: 'invented_criteria',
            severity: 'strong',
            title: 'Possible Invented Criteria',
            description: 'This feedback may be evaluating against criteria not provided by the teacher. Review to ensure it aligns with your success criteria.',
            location: `Growth Area #${index + 1}`,
          });
          break;
        }
      }
    }
  });

  return warnings;
}

/**
 * Main validation function - runs all checks and returns warnings
 */
export function validateFeedback(
  feedback: FeedbackSession,
  successCriteria: string[] = []
): FeedbackWarning[] {
  const warnings: FeedbackWarning[] = [];

  // Run all validation checks
  warnings.push(...checkAbilityPraise(feedback));
  warnings.push(...checkPeerComparison(feedback));
  warnings.push(...checkVagueComments(feedback));
  warnings.push(...checkMissingFeedbackTypes(feedback));
  warnings.push(...checkLowSpecificity(feedback));

  // New LARA principle-aligned checks
  warnings.push(...checkMissingAnchors(feedback));
  warnings.push(...checkExcessiveCount(feedback));
  warnings.push(...checkMissingReflection(feedback));
  warnings.push(...checkNoStrengths(feedback));
  warnings.push(...checkCtaTooLong(feedback));

  if (successCriteria.length > 0) {
    warnings.push(...checkInventedCriteria(feedback, successCriteria));
  }

  return warnings;
}

/**
 * Get warnings grouped by severity
 */
export function getWarningsBySeverity(warnings: FeedbackWarning[]): {
  strong: FeedbackWarning[];
  soft: FeedbackWarning[];
} {
  return {
    strong: warnings.filter(w => w.severity === 'strong'),
    soft: warnings.filter(w => w.severity === 'soft'),
  };
}
