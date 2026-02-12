import anthropic, { CLAUDE_MODEL } from '../lib/anthropic';
import prisma from '../lib/prisma';
import { FeedbackSession } from '../types';

export async function generateFeedback(
  taskPrompt: string,
  criteria: string[],
  studentWork: string
): Promise<FeedbackSession> {
  const systemPrompt = `You are LARA, a formative feedback assistant.
IMPORTANT: Always use Australian/UK English spelling in all generated text (e.g., colour, behaviour, organisation, customise, analyse, recognise, learnt).
CRITICAL: Never use em dashes (\u2014) or en dashes (\u2013) in any generated text. Use commas, full stops, or semicolons instead.

CRITICAL: You MUST respond with ONLY valid JSON. No introductory text, no explanations, no markdown - ONLY the JSON object. Start your response with { and end with }.

## CORE PRINCIPLES

### 1. Three Questions Framework
Every response MUST answer:
- "Where am I going?" → goal field (restate learning objective)
- "How am I going?" → strengths + growthAreas (with evidence from work)
- "Where to next?" → nextSteps (immediately actionable)

### 2. Focus on Work, Not Person
- NEVER use ability praise ("you're smart", "natural talent", "gifted")
- NEVER compare to peers ("better than others")
- Focus on: task (what was done), process (strategies), self_reg (metacognition)

### 3. Be Specific with Anchors
- EVERY strength MUST include a direct quote from student work as "anchor"
- EVERY growthArea MUST include a quote showing where improvement is needed
- FORBIDDEN vague phrases: "Good job", "Nice work", "Add more detail", "Be clearer", "Needs work"

### 4. Concise & High-Impact
- Maximum: 2 strengths, 1-2 growthAreas, 2-3 nextSteps
- IMPORTANT: Always generate exactly 2-3 next steps. Never generate fewer than 2.
- Keep each "text" field under 100 words
- Keep anchors SHORT (max 20 words, just key phrases)
- Focus on HIGH-LEVERAGE improvements only

### 5. Emotionally Safe
- ALWAYS include at least one genuine strength
- Frame growthAreas as opportunities, not failures
- Normalize mistakes as part of learning
- Balance criticism with encouragement

### 6. Align to Success Criteria
- Link each feedback item to a specific criterion using criterionRef (0-based index)
- NEVER evaluate against criteria not provided by the teacher

---

## TASK CONTEXT

Task Prompt: "${taskPrompt}"

Success Criteria:
${criteria.map((c, i) => `${i}. ${c}`).join('\n')}

---

## MASTERY DETECTION
- Set "masteryAchieved" to true ONLY if the student has met ALL the success criteria
- If there are any significant growth areas or missing criteria, set it to false
- Be honest but encouraging - mastery means the work meets the teacher's requirements
- If masteryAchieved is true, nextSteps should be optional "challenge yourself" improvements, not required fixes

---

## OUTPUT FORMAT

IMPORTANT: Respond with ONLY the JSON object below. No text before or after. Start with { and end with }.

{
  "goal": "Clear restatement of what success looks like based on the criteria",
  "masteryAchieved": true/false,
  "strengths": [
    {
      "id": "str-0",
      "type": "task" | "process" | "self_reg",
      "text": "Specific praise tied to the work",
      "anchors": ["REQUIRED: direct quote from student work"],
      "criterionRef": 0
    }
  ],
  "growthAreas": [
    {
      "id": "grow-0",
      "type": "task" | "process" | "self_reg",
      "text": "Specific area for improvement with direction",
      "anchors": ["REQUIRED: quote showing where to improve"],
      "criterionRef": 0,
      "primaryTag": "ATQ" | "EVIDENCE" | "REASONING" | "TERMS" | "CLARITY"
    }
  ],
  "nextSteps": [
    {
      "id": "next-0",
      "actionVerb": "Add|Revise|Define|Explain|Restructure",
      "target": "specific part of work",
      "successIndicator": "what success looks like",
      "reflectionPrompt": "Question for student thinking, e.g., 'What evidence could strengthen this?'",
      "ctaText": "≤40 chars for button",
      "actionType": "revise" | "improve_section" | "reupload" | "rehearse"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: studentWork,
      },
    ],
  });

  // Check if response was truncated
  if (message.stop_reason === 'max_tokens') {
    console.error('AI response was truncated due to max_tokens limit');
    throw new Error('AI response was truncated - feedback too long');
  }

  // Extract text from Claude response
  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response');
  }

  let jsonText = textContent.text.trim();

  // Strip markdown code fences if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  }
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  // Extract JSON object - find the outermost { } pair
  const firstBrace = jsonText.indexOf('{');
  if (firstBrace === -1) {
    console.error('No JSON object found in response:', jsonText.substring(0, 200));
    throw new Error('AI response did not contain valid JSON. Response started with: ' + jsonText.substring(0, 50));
  }

  let depth = 0;
  let lastBrace = -1;
  for (let i = firstBrace; i < jsonText.length; i++) {
    if (jsonText[i] === '{') depth++;
    else if (jsonText[i] === '}') {
      depth--;
      if (depth === 0) {
        lastBrace = i;
        break;
      }
    }
  }

  if (lastBrace === -1) {
    console.error('Incomplete JSON object in response:', jsonText.substring(0, 200));
    throw new Error('AI response contained incomplete JSON');
  }

  jsonText = jsonText.slice(firstBrace, lastBrace + 1);

  // Parse JSON from response
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Raw text:', jsonText.substring(0, 500));
    throw new Error('Failed to parse AI response as JSON');
  }

  // === POST-GENERATION NORMALIZATION ===

  // Enforce limits (Principle 4: Concise & High-Impact)
  data.strengths = (data.strengths || []).slice(0, 3);
  data.growthAreas = (data.growthAreas || []).slice(0, 2);
  data.nextSteps = (data.nextSteps || []).slice(0, 3);

  // Fallback: ensure at least 2 next steps (Principle 4: 2-3 nextSteps)
  if (data.nextSteps.length < 2 && data.nextSteps.length > 0) {
    data.nextSteps.push({ ...data.nextSteps[0], id: `next-fallback-${data.nextSteps.length}` });
  }

  // Ensure IDs are strings
  data.strengths.forEach((s: any, i: number) => (s.id = `str-${i}`));
  data.growthAreas.forEach((g: any, i: number) => (g.id = `grow-${i}`));
  data.nextSteps.forEach((n: any, i: number) => (n.id = `next-${i}`));

  // Normalize nextSteps: ensure ctaText length and reflectionPrompt
  data.nextSteps = data.nextSteps.map((step: any) => ({
    ...step,
    ctaText: step.ctaText?.slice(0, 40) || 'Continue',
    reflectionPrompt: step.reflectionPrompt || 'What will you try differently?',
  }));

  // Ensure at least one strength (Principle 5: Emotional Safety)
  if (data.strengths.length === 0) {
    data.strengths.push({
      id: 'str-fallback',
      type: 'task',
      text: 'You made an attempt to address the task',
      anchors: [],
      criterionRef: null,
    });
  }

  // Fallback: if AI didn't return masteryAchieved, infer from growthAreas
  if (typeof data.masteryAchieved !== 'boolean') {
    data.masteryAchieved = data.growthAreas.length === 0;
  }

  // Post-process: remove em dashes and en dashes from all text fields
  const stripDashes = (text: string): string =>
    text.replace(/\u2014/g, ', ').replace(/\u2013/g, ', ');

  if (data.goal) data.goal = stripDashes(data.goal);
  data.strengths.forEach((s: any) => {
    if (s.text) s.text = stripDashes(s.text);
  });
  data.growthAreas.forEach((g: any) => {
    if (g.text) g.text = stripDashes(g.text);
  });
  data.nextSteps.forEach((n: any) => {
    if (n.target) n.target = stripDashes(n.target);
    if (n.successIndicator) n.successIndicator = stripDashes(n.successIndicator);
    if (n.reflectionPrompt) n.reflectionPrompt = stripDashes(n.reflectionPrompt);
  });

  // Validate and normalize primaryTag on growth areas
  const validTags = ['ATQ', 'EVIDENCE', 'REASONING', 'TERMS', 'CLARITY'];
  data.growthAreas.forEach((g: any) => {
    if (!g.primaryTag || !validTags.includes(g.primaryTag)) {
      g.primaryTag = undefined; // Frontend fallback will classify
    }
  });

  return data as FeedbackSession;
}

/**
 * Detect if a revision aligns with the chosen next step
 */
export async function detectRevisionAlignment(
  originalContent: string,
  revisedContent: string,
  chosenNextStep: { actionVerb: string; target: string; successIndicator: string }
): Promise<'aligned' | 'uncertain'> {
  try {
    const systemPrompt = `You are analyzing a student revision to determine if it addresses the recommended next step.

CRITICAL: Respond with ONLY a single word: "aligned" or "uncertain". No other text.

## Context
The student was given feedback with the following next step recommendation:
- Action: ${chosenNextStep.actionVerb}
- Target: ${chosenNextStep.target}
- Success looks like: ${chosenNextStep.successIndicator}

## Your Task
Compare the original work with the revised work. Determine if the revision meaningfully addresses the next step.

Answer "aligned" if:
- The revision shows clear changes related to the target area
- The changes reflect an attempt to follow the action verb (e.g., if "Add", something was added)
- The revision moves toward the success indicator

Answer "uncertain" if:
- No meaningful changes were made
- Changes are unrelated to the recommended next step
- Cannot determine if the revision addresses the feedback`;

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 10,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `ORIGINAL WORK:\n${originalContent}\n\n---\n\nREVISED WORK:\n${revisedContent}`,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return 'uncertain';
    }

    const result = textContent.text.trim().toLowerCase();
    return result === 'aligned' ? 'aligned' : 'uncertain';
  } catch (error) {
    console.error('Revision detection error:', error);
    return 'uncertain';
  }
}

export async function logAiUsage(
  teacherId: string,
  operation: string,
  studentCount: number = 1,
  taskId?: string,
  sessionId?: string,
  validationWarnings: string[] = []
): Promise<void> {
  // Use transaction to ensure both operations succeed or fail together
  await prisma.$transaction(async (tx) => {
    await tx.aiUsageLog.create({
      data: {
        teacherId,
        taskId,
        sessionId,
        operation,
        studentCount,
        model: CLAUDE_MODEL,
        validationWarnings,
      },
    });

    // Increment teacher's AI call usage
    await tx.teacher.update({
      where: { id: teacherId },
      data: {
        aiCallsUsed: { increment: studentCount },
      },
    });
  });
}

export async function checkTeacherQuota(teacherId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
  });

  if (!teacher) {
    return { allowed: false, used: 0, limit: 0, remaining: 0 };
  }

  const { TIER_CONFIGS } = await import('../types');
  const tierConfig = TIER_CONFIGS[teacher.tier] || TIER_CONFIGS.starter;

  // Check if we need to reset monthly usage
  const now = new Date();
  const resetDate = new Date(teacher.aiCallsReset);
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    // Reset monthly usage
    await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        aiCallsUsed: 0,
        aiCallsReset: now,
      },
    });
    return {
      allowed: true,
      used: 0,
      limit: tierConfig.monthlyAiCalls,
      remaining: tierConfig.monthlyAiCalls,
    };
  }

  const remaining = tierConfig.monthlyAiCalls - teacher.aiCallsUsed;

  return {
    allowed: remaining > 0,
    used: teacher.aiCallsUsed,
    limit: tierConfig.monthlyAiCalls,
    remaining: Math.max(0, remaining),
  };
}
