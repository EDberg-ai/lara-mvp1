import Anthropic from "@anthropic-ai/sdk";
import { FeedbackSession } from "../types";

// Helper function to get or create Anthropic client
// This ensures the API key is read at runtime, not build time
function getAnthropicClient(): Anthropic {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'Missing Anthropic API key. Please set ANTHROPIC_API_KEY in your environment variables. ' +
      'For Netlify: Add it in Site settings → Build & deploy → Environment variables'
    );
  }

  return new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Required for browser usage
  });
}

export async function generateFeedback(
  taskPrompt: string,
  criteria: string[],
  studentWork: string
): Promise<FeedbackSession> {

  const systemPrompt = `You are LARA, a helpful teacher's assistant.
Analyze the student's writing based ONLY on the provided prompt and success criteria.
Be encouraging but specific.

Task Prompt: "${taskPrompt}"
Success Criteria:
${criteria.map(c => `- ${c}`).join('\n')}

MASTERY DETECTION:
- Set "masteryAchieved" to true ONLY if the student has met ALL the success criteria
- If there are any significant growth areas or missing criteria, set it to false
- Be honest but encouraging - mastery means the work meets the teacher's requirements

You must respond with ONLY valid JSON matching this exact structure:
{
  "goal": "string - A summary of the learning goal",
  "masteryAchieved": boolean - true if ALL success criteria are met with no significant gaps,
  "strengths": [
    {
      "id": "string",
      "type": "task" | "process" | "self_reg",
      "text": "string - What they did well",
      "anchors": ["string - specific examples from their work"]
    }
  ],
  "growthAreas": [
    {
      "id": "string",
      "type": "task" | "process" | "self_reg",
      "text": "string - What needs improvement",
      "anchors": ["string - specific examples"]
    }
  ],
  "nextSteps": [
    {
      "id": "string",
      "actionVerb": "string",
      "target": "string",
      "successIndicator": "string",
      "ctaText": "string",
      "actionType": "revise" | "improve_section" | "reupload" | "rehearse"
    }
  ]
}

NOTE: If masteryAchieved is true, nextSteps should be optional "challenge yourself" improvements, not required fixes.`;

  try {
    // Get client at runtime (reads env vars at runtime, not build time)
    const anthropic = getAnthropicClient();

    const message = await anthropic.messages.create({
      model: import.meta.env.VITE_CLAUDE_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: studentWork
        }
      ]
    });

    // Extract text from Claude response
    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error("No text content in response");
    }

    const text = textContent.text;

    // Strip markdown code fences if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7); // Remove ```json
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3); // Remove ```
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3); // Remove trailing ```
    }
    jsonText = jsonText.trim();

    // Parse JSON from response
    const data = JSON.parse(jsonText);

    // Ensure IDs are strings if model generates numbers
    data.strengths.forEach((s: any, i: number) => s.id = `str-${i}`);
    data.growthAreas.forEach((g: any, i: number) => g.id = `grow-${i}`);
    data.nextSteps.forEach((n: any, i: number) => n.id = `next-${i}`);

    // Fallback: if AI didn't return masteryAchieved, infer from growthAreas
    if (typeof data.masteryAchieved !== 'boolean') {
      data.masteryAchieved = data.growthAreas.length === 0;
    }

    return data as FeedbackSession;

  } catch (error) {
    console.error("Claude API Error:", error);

    // Re-throw the error so StudentEntry can handle it properly
    throw new Error(
      error instanceof Error
        ? `Claude API Error: ${error.message}`
        : 'Failed to generate feedback'
    );
  }
}
