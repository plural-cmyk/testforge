// TestForge AI Integration
// Supports three backends with automatic retry + fallback:
// 1. Google Gemini Native API (via GEMINI_API_KEY — uses native endpoint, different rate limit pool)
// 2. OpenAI-compatible API (via OPENAI_API_KEY + OPENAI_BASE_URL)
// 3. Sandbox: z-ai-web-dev-sdk (auto-configured in sandbox environment)
//
// Key anti-429 strategies:
// - Uses Gemini NATIVE API (generateContent) instead of OpenAI-compatible endpoint
//   (These have SEPARATE rate limit pools — switching often resolves persistent 429s)
// - Aggressive exponential backoff for 429: 15s, 30s, 60s, 90s, 120s
// - Rate-limit cooldown tracker (60s cooldown after 429)
// - Key rotation (GEMINI_API_KEY, GEMINI_API_KEY_2, etc.)
// - Automatic backend fallback
// - Inter-call spacing to prevent burst rate limiting

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
  backend?: string;
}

// ─── Configuration ───────────────────────────────────────────────

const MAX_RETRIES = 5;
const RATE_LIMIT_COOLDOWN_MS = 60_000; // 60s — Gemini rate limit window
const INTER_CALL_DELAY_MS = 5_000; // 5s delay between sequential AI calls

// ─── Rate Limit Cooldown Tracker ─────────────────────────────────

const backendCooldowns = new Map<string, number>();

function isBackendCoolingDown(name: string): boolean {
  const cooldownUntil = backendCooldowns.get(name);
  if (!cooldownUntil) return false;
  if (Date.now() >= cooldownUntil) {
    backendCooldowns.delete(name);
    return false;
  }
  return true;
}

function setBackendCooldown(name: string, durationMs: number = RATE_LIMIT_COOLDOWN_MS): void {
  backendCooldowns.set(name, Date.now() + durationMs);
  console.warn(`[AI] ${name} is now in cooldown for ${Math.round(durationMs / 1000)}s`);
}

// ─── Backend Availability Checks ─────────────────────────────────

function getGeminiApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY);
  }
  for (let i = 2; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

function isGeminiConfigured(): boolean {
  return getGeminiApiKeys().length > 0;
}

function isOpenAIConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY);
}

function isSandboxAvailable(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
}

// ─── Error Types ─────────────────────────────────────────────────

class RetryableError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'RetryableError';
    this.statusCode = statusCode;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 500;
}

// ─── Backoff Calculation ─────────────────────────────────────────

function calculateDelay(attempt: number, statusCode: number): number {
  const jitter = Math.random() * 2000;

  if (statusCode === 429) {
    // Rate limit: very aggressive backoff
    const delays = [15_000, 30_000, 60_000, 90_000, 120_000];
    return (delays[attempt] || 120_000) + jitter;
  }

  // Server error: standard exponential backoff
  const exponentialDelay = 2000 * Math.pow(2, attempt);
  return Math.min(exponentialDelay + jitter, 32_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Inter-Call Spacing ──────────────────────────────────────────

let lastCallTimestamp = 0;

export async function rateLimitDelay(): Promise<void> {
  const elapsed = Date.now() - lastCallTimestamp;
  const remaining = INTER_CALL_DELAY_MS - elapsed;
  if (remaining > 0) {
    console.log(`[AI] Rate-limit spacing: waiting ${Math.round(remaining / 1000)}s before next call...`);
    await sleep(remaining);
  }
}

function recordCallTime(): void {
  lastCallTimestamp = Date.now();
}

// ─── Gemini NATIVE API Backend ───────────────────────────────────
// Uses the native generateContent endpoint instead of the
// OpenAI-compatible one. These have SEPARATE rate limit pools,
// so switching often resolves persistent 429 errors.

interface GeminiContent {
  role: string;
  parts: Array<{ text: string }>;
}

async function callGemini(
  messages: ClaudeMessage[],
  options?: { maxTokens?: number; temperature?: number },
  apiKeyIndex: number = 0
): Promise<ClaudeResponse> {
  const keys = getGeminiApiKeys();
  const apiKey = keys[apiKeyIndex % keys.length];
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required. Get one at https://aistudio.google.com/apikey');
  }

  // Convert messages to Gemini native format
  // Gemini uses "user" and "model" roles, with system prompt injected as first user message
  const contents: GeminiContent[] = [];
  let systemInstruction: string | undefined;

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else if (msg.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text: msg.content }] });
    } else {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
    }
  }

  // Build request body for native Gemini API
  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: options?.maxTokens || 4096,
      temperature: options?.temperature || 0.3,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  // Use the NATIVE Gemini REST API endpoint (NOT the OpenAI-compatible one)
  // This uses a DIFFERENT rate limit pool
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log(`[AI] Gemini native API: model=${model}, key=${apiKeyIndex + 1}/${keys.length}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
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

  // Parse native Gemini response format
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Check for blocked content
  if (data.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('Gemini blocked the response due to safety filters. Try rephrasing your request.');
  }

  const keyLabel = keys.length > 1 ? ` (key ${apiKeyIndex + 1}/${keys.length})` : '';

  return {
    text,
    backend: `gemini-native/${model}${keyLabel}`,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
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
    throw new Error('OPENAI_API_KEY environment variable is required. Please add it in your Vercel project settings.');
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
  recordCallTime();

  const availableBackends = BACKENDS.filter((b) => {
    if (!b.isAvailable()) return false;
    if (isBackendCoolingDown(b.name)) {
      console.log(`[AI] Skipping ${b.name} — in rate-limit cooldown`);
      return false;
    }
    return true;
  });

  if (availableBackends.length === 0) {
    const allConfigured = BACKENDS.filter((b) => b.isAvailable());
    if (allConfigured.length > 0) {
      const cooldownRemaining = Math.min(
        ...allConfigured.map((b) => {
          const until = backendCooldowns.get(b.name) || 0;
          return Math.max(0, until - Date.now());
        })
      );
      throw new Error(
        `All AI backends are in rate-limit cooldown. ` +
        `Please wait ${Math.ceil(cooldownRemaining / 1000)} seconds and try again.`
      );
    }
    throw new Error(
      'No AI backend configured. Set GEMINI_API_KEY or OPENAI_API_KEY environment variable to enable AI features.'
    );
  }

  const errors: string[] = [];

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

        backendCooldowns.delete(backend.name);
        return response;
      } catch (error: unknown) {
        if (error instanceof RetryableError) {
          const delay = calculateDelay(attempt, error.statusCode);

          if (error.statusCode === 429) {
            setBackendCooldown(backend.name, RATE_LIMIT_COOLDOWN_MS);
          }

          console.warn(
            `[AI] ${backend.name} returned ${error.statusCode} (attempt ${attempt + 1}/${MAX_RETRIES}), ` +
            `retrying in ${Math.round(delay / 1000)}s...`
          );

          if (attempt < MAX_RETRIES - 1) {
            await sleep(delay);
            continue;
          }

          errors.push(`${backend.name}: Rate limited (429) — retries exhausted`);
          console.warn(`[AI] ${backend.name} exhausted retries, falling back...`);
          break;
        }

        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${backend.name}: ${errorMsg}`);
        console.warn(`[AI] ${backend.name} failed, falling back...`);
        break;
      }
    }
  }

  const combinedErrors = errors.join('\n');
  console.error('[AI] All backends failed:', combinedErrors);
  throw new Error(
    `AI request failed — all backends exhausted.\n\n` +
    `Errors:\n${combinedErrors}\n\n` +
    `Solutions:\n` +
    `1. Wait 60 seconds and try again\n` +
    `2. Add OPENAI_API_KEY in Vercel env vars as a fallback\n` +
    `3. Use "frontend" or "backend" scope instead of "Full Stack" to use only 1 API call`
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
  // For "fullstack" scope, generate ALL test types in a SINGLE API call
  // This uses only 1 API request instead of 3, massively reducing rate limit risk
  const scopeLabel = context.testType === 'fullstack'
    ? 'frontend, backend, and E2E'
    : context.testType;

  const systemPrompt = `You are an expert test automation engineer. You generate comprehensive, runnable test code.
You MUST output ONLY valid test code — no markdown, no explanations, no comments outside the code.
Match the testing framework to the project's tech stack.
Write deterministic tests that are atomic and have no side effects.
For API tests: test happy path, missing required fields, unauthorized access, and malformed input.
For UI tests: test render success, user interaction, and error state display.
For E2E tests: test complete user journeys from UI action to data persistence.

${context.testType === 'fullstack' ? `When generating fullstack tests, output ALL test suites in a single file with clear section comments:
// === FRONTEND TESTS ===
... frontend test code ...

// === BACKEND TESTS ===
... backend test code ...

// === E2E TESTS ===
... e2e test code ...` : ''}`;

  const userPrompt = `Generate ${scopeLabel} tests for the following project:

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
    { maxTokens: 16384, temperature: 0.2 }
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
