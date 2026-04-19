import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

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
}

export async function callClaude(
  messages: ClaudeMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ClaudeResponse> {
  try {
    const zai = await getZAI();

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
      usage: {
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Claude API error:', errorMessage);
    throw new Error(`AI API call failed: ${errorMessage}`);
  }
}

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
