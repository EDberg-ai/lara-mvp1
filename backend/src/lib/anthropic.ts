import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is required');
}

export const anthropic = new Anthropic({
  apiKey,
});

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

export default anthropic;
