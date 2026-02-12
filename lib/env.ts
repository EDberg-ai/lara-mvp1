// Environment Variable Utilities
// Centralized access to environment variables with validation

/**
 * Gets an environment variable with validation
 */
function getEnvVar(key: string, required: boolean = false): string | undefined {
  const value = import.meta.env[key];

  if (required && (!value || value.trim() === '')) {
    throw new Error(
      `Missing required environment variable: ${key}\n\n` +
      `Please add it to your .env file or Netlify environment variables.\n` +
      `For Netlify: Site settings → Build & deploy → Environment variables`
    );
  }

  return value;
}

/**
 * Gets the Anthropic API key (required)
 */
export function getAnthropicApiKey(): string {
  const apiKey = getEnvVar('ANTHROPIC_API_KEY', true);
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required but not set');
  }
  return apiKey;
}

/**
 * Gets the Claude model name (has default fallback)
 */
export function getClaudeModel(): string {
  return getEnvVar('VITE_CLAUDE_MODEL') || 'claude-3-5-sonnet-20241022';
}

/**
 * Gets the base URL (has default fallback)
 */
export function getBaseUrl(): string {
  return getEnvVar('VITE_BASE_URL') || window.location.origin;
}

/**
 * Validates all required environment variables at app startup
 * Call this early in your app initialization
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    getAnthropicApiKey();
  } catch (e) {
    errors.push('Missing ANTHROPIC_API_KEY');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gets all environment info for debugging (without exposing sensitive data)
 */
export function getEnvironmentInfo() {
  return {
    hasApiKey: !!import.meta.env.ANTHROPIC_API_KEY,
    model: getClaudeModel(),
    baseUrl: getBaseUrl(),
    isDev: import.meta.env.DEV,
    mode: import.meta.env.MODE
  };
}
