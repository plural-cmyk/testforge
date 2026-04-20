// TestForge AI Integration
// Supports three backends with automatic retry + fallback:
// 1. Google Gemini API (via GEMINI_API_KEY — recommended, free tier available)
// 2. OpenAI-compatible API (via OPENAI_API_KEY + OPENAI_BASE_URL)
// 3. Sandbox: z-ai-web-dev-sdk (auto-configured in sandbox environment)
//
// On 429 (rate limit) or 503 (overloaded) errors, the system:
// - Retries with exponential backoff (up to 3 attempts)
// - Falls back to the next available backend if retries are exhausted

export interface ClaudeMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  backend?: string; // Which backend was used
}

// ─── Configuration ───────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s initial backoff
const MAX_DELAY_MS = 15000; // 15s max backoff

function isGeminiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY);
}

function isOpenAIConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY);
}

function isSandboxAvailable(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
}

// ─── Retry Helper ────────────────────────────────────────────────

class RetryableError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'RetryableError';
    this.statusCode = statusCode;
  }
}

function isRetryableStatus(status: number): boolean {
  // 429 = rate limited, 503 = service overloaded, 500 = server error
  return status === 429 || status === 503 || status === 500;
}

function calculateDelay(attempt: number): number {
  // Exponential backoff with jitter: 1s, 2s, 4s (±random)
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Gemini Backend ──────────────────────────────────────────────

async function callGemini(
  messages: ClaudeMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<ClaudeResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required. Get one at https://aistudio.google.com/apikey');
  }

  // Gemini's OpenAI-compatible endpoint
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (isRetryableStatus(response.status)) {
      throw new RetryableError(
        `Gemini API error (${response.status}): ${errorBody}`,
        response.status
      );
    }
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  return {
    text,
    backend: `gemini/${model}`,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}

// ─── OpenAI Backend ──────────────────────────────────────────────

async function callOpenAI(
  messages: ClaudeMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<ClaudeResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required for AI features. Please add it in your Vercel project settings.');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (isRetryableStatus(response.status)) {
      throw new RetryableError(
        `OpenAI API error (${response.status}): ${errorBody}`,
        response.status
      );
    }
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  return {
    text,
    backend: `openai/${model}`,
    usage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    },
  };
}

// ─── Sandbox Backend ─────────────────────────────────────────────

async function callSandboxAI(
  messages: ClaudeMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<ClaudeResponse> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const zai = await ZAI.create();

  const completion = await zai.chat.completions.create({
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature || 0.3,
  });

  const text = completion.choices[0]?.message?.content || '';

  return {
    text,
    backend: 'sandbox',
    usage: {
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    },
  };
}

// ─── Backend Definitions ─────────────────────────────────────────

interface Backend {
  name: string;
  isAvailable: () => boolean;
  call: (messages: ClaudeMessage[], options?: { maxTokens?: number; temperature?: number }) => Promise<ClaudeResponse>;
}

const BACKENDS: Backend[] = [
  { name: 'Gemini', isAvailable: isGeminiConfigured, call: callGemini },
  { name: 'OpenAI', isAvailable: isOpenAIConfigured, call: callOpenAI },
  { name: 'Sandbox', isAvailable: isSandboxAvailable, call: callSandboxAI },
];

// ─── Main Entry Point with Retry + Fallback ─────────────────────

export async function callClaude(
  messages: ClaudeMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ClaudeResponse> {
  // Collect available backends in priority order
  const availableBackends = BACKENDS.filter((b) => b.isAvailable());

  if (availableBackends.length === 0) {
    throw new Error(
      'No AI backend configured. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable to enable AI features.'
    );
  }

  // Track errors for the final error message
  const errors: string[] = [];

  // Try each available backend with retries
  for (const backend of availableBackends) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(
          `[AI] Calling ${backend.name} (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        const response = await backend.call(messages, options);
        console.log(`[AI] ${backend.name} succeeded`, {
          backend: response.backend,
          inputTokens: response.usage?.inputTokens,
          outputTokens: response.usage?.outputTokens,
        });
        return response;
      } catch (error: unknown) {
        if (error instanceof RetryableError) {
          // Retryable error (429, 503, 500) — retry with backoff
          const delay = calculateDelay(attempt);
          console.warn(
            `[AI] ${backend.name} returned retryable error (${error.statusCode}), ` +
            `retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`
          );

          if (attempt < MAX_RETRIES - 1) {
            await sleep(delay);
            continue; // Retry same backend
          }

          // Exhausted retries for this backend — log and try next
          errors.push(`${backend.name}: ${error.message} (retries exhausted)`);
          console.warn(
            `[AI] ${backend.name} exhausted ${MAX_RETRIES} retries, ` +
            `falling back to next available backend...`
          );
          break; // Move to next backend
        }

        // Non-retryable error — try next backend
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${backend.name}: ${errorMsg}`);
        console.warn(
          `[AI] ${backend.name} failed with non-retryable error, ` +
          `falling back to next available backend...`
        );
        break; // Move to next backend
      }
    }
  }

  // All backends failed
  const combinedErrors = errors.join('\n');
  console.error('[AI] All backends failed:', combinedErrors);
  throw new Error(
    `All AI backends failed. Errors:\n${combinedErrors}\n\n` +
    'Tips:\n' +
    '- If using Gemini free tier, you may have hit the rate limit. Wait a minute and try again.\n' +
    '- Add OPENAI_API_KEY as a fallback backend in your Vercel environment variables.\n' +
    '- Gemini free tier: 15 RPM / 1M tokens per minute for flash models.'
  );
}

// ─── High-Level AI Functions ─────────────────────────────────────

export async function generateTestCode(
  context: {
    repoStructure?: string;
    apiSpec?: string;
    appUrl?: string;
    framework: string;
    testType: 'frontend' | 'backend' | 'e2e' | 'fullstack';
    additionalInstructions?: string;
  }
): Promise<string> {
  const systemPrompt = `You are an expert test automation engineer. You generate comprehensive, runnable test code.
You MUST output ONLY valid test code — no markdown, no explanations, no comments outside the code.
Match the testing framework to the project's tech stack.
Write deterministic tests that are atomic and have no side effects.
For API tests: test happy path, missing required fields, unauthorized access, and malformed input.
For UI tests: test render success, user interaction, and error state display.
For E2E tests: test complete user journeys from UI action to data persistence.`;

  const userPrompt = `Generate ${context.testType} tests for the following project:

Framework/Stack: ${context.framework}
${context.repoStructure ? `Repository Structure:\n${context.repoStructure}\n` : ''}
${context.apiSpec ? `API Specification:\n${context.apiSpec}\n` : ''}
${context.appUrl ? `Application URL: ${context.appUrl}\n` : ''}
${context.additionalInstructions ? `Additional Instructions: ${context.additionalInstructions}\n` : ''}

Generate a complete, runnable test suite. Use the appropriate testing framework for the detected stack:
- React/Next.js → Vitest + React Testing Library + Playwright for E2E
- Vue/Nuxt → Vitest + Vue Test Utils + Playwright for E2E
- Express/Fastify → Vitest + Supertest
- Python/FastAPI → Pytest + httpx
- Generic → Playwright + appropriate assertion library

Output ONLY the test code, no markdown fences or explanations.`;

  const response = await callClaude(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 8192, temperature: 0.2 }
  );

  return response.text;
}

export async function analyzeTestFailure(
  testCode: string,
  errorMessage: string,
  appContext?: string
): Promise<{ explanation: string; suggestedFix: string }> {
  const systemPrompt = `You are an expert QA engineer who analyzes test failures.
Given a failing test and its error output, you:
1. Explain the failure in plain English (why it broke)
2. Suggest a specific code fix to make the test pass again

Output your response as JSON with two fields:
- "explanation": plain English explanation of why the test failed
- "suggestedFix": the corrected test code that should pass`;

  const userPrompt = `Analyze this failing test:

TEST CODE:
\`\`\`
${testCode}
\`\`\`

ERROR OUTPUT:
\`\`\`
${errorMessage}
\`\`\`

${appContext ? `APP CONTEXT:\n${appContext}\n` : ''}

Explain why this test failed and provide a fix. Output JSON only.`;

  const response = await callClaude(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 4096, temperature: 0.2 }
  );

  try {
    const cleaned = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      explanation: 'Failed to parse AI analysis. The test may have failed due to a selector change, API response format change, or timing issue.',
      suggestedFix: testCode,
    };
  }
}

export async function selfHealTest(
  oldTestCode: string,
  errorMessage: string,
  newAppSnapshot?: string
): Promise<{ healedCode: string; changeDescription: string }> {
  const systemPrompt = `You are an expert at self-healing broken tests.
When a test fails because the application has changed (selectors, API responses, etc.),
you rewrite the test to match the new state of the application while preserving the test's intent.

Output JSON with two fields:
- "healedCode": the corrected test code
- "changeDescription": a one-line description of what changed (e.g., "Selector .btn-primary changed to .btn-submit")`;

  const userPrompt = `Self-heal this broken test:

OLD TEST CODE:
\`\`\`
${oldTestCode}
\`\`\`

FAILURE REASON:
\`\`\`
${errorMessage}
\`\`\`

${newAppSnapshot ? `NEW APP STATE/SNAPSHOT:\n${newAppSnapshot}\n` : ''}

Rewrite the test to work with the current application state. Output JSON only.`;

  const response = await callClaude(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 4096, temperature: 0.2 }
  );

  try {
    const cleaned = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      healedCode: oldTestCode,
      changeDescription: 'Unable to auto-heal. Manual review required.',
    };
  }
}
