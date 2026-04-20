import { generateTestCode } from './claude';
import { DetectedStack, getRecommendedTestingFramework, formatStackSummary } from './stackDetector';
import { db } from './db';

export interface TestGenerationRequest {
  projectId: string;
  testType: 'frontend' | 'backend' | 'e2e' | 'fullstack';
  repoStructure?: string;
  apiSpec?: string;
  appUrl?: string;
  stack?: DetectedStack;
  additionalInstructions?: string;
}

export interface GeneratedTestCase {
  title: string;
  code: string;
  type: 'frontend' | 'backend' | 'e2e';
  filePath?: string;
}

export async function generateTests(
  request: TestGenerationRequest
): Promise<GeneratedTestCase[]> {
  const { projectId, testType, repoStructure, apiSpec, appUrl, stack, additionalInstructions } = request;

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const detectedStack = stack || {
    frontend: project.stack ? project.stack.split(',').filter((s) => s.includes('React') || s.includes('Vue') || s.includes('Next') || s.includes('Angular')) : [],
    backend: project.stack ? project.stack.split(',').filter((s) => s.includes('Express') || s.includes('FastAPI') || s.includes('Django') || s.includes('Node')) : [],
    testing: [],
    language: 'typescript',
    packageManager: 'npm',
    confidence: 0.5,
  };

  const testFramework = getRecommendedTestingFramework(detectedStack);
  const frameworkDescription = formatStackSummary(detectedStack);

  // SINGLE API CALL for all test types (including fullstack)
  // Previously fullstack made 3 separate calls (frontend, backend, e2e)
  // which exhausted Gemini's 15 RPM free tier in one click.
  // Now we make just 1 call and parse the combined output.
  const rawCode = await generateTestCode({
    repoStructure: repoStructure || undefined,
    apiSpec: apiSpec || project.apiSpecUrl || undefined,
    appUrl: appUrl || project.appUrl || undefined,
    framework: frameworkDescription,
    testType,
    additionalInstructions: additionalInstructions || undefined,
  });

  // Parse the generated code into individual test cases
  const allTests = parseFullstackCode(rawCode, testType);

  // Save all test cases to database
  for (const testCase of allTests) {
    await db.testCase.create({
      data: {
        projectId,
        title: testCase.title,
        code: testCase.code,
        type: testCase.type,
        filePath: testCase.filePath,
      },
    });
  }

  return allTests;
}

/**
 * Parse generated code into test cases.
 * For fullstack: splits on section markers (=== FRONTEND ===, etc.)
 * For single scope: parses describe/test blocks as before
 */
function parseFullstackCode(
  rawCode: string,
  testType: 'frontend' | 'backend' | 'e2e' | 'fullstack'
): GeneratedTestCase[] {
  const cleanCode = rawCode
    .replace(/^```(?:typescript|javascript|python|ts|js)?\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();

  if (testType === 'fullstack') {
    return parseFullstackSections(cleanCode);
  }

  // Single scope — parse as before
  const testCases = parseGeneratedCode(cleanCode, testType);
  return testCases;
}

/**
 * Split fullstack output into frontend/backend/e2e sections
 * based on the section markers we instruct the AI to include
 */
function parseFullstackSections(code: string): GeneratedTestCase[] {
  const results: GeneratedTestCase[] = [];

  // Try to split on section markers like:
  // // === FRONTEND TESTS ===
  // // === BACKEND TESTS ===
  // // === E2E TESTS ===
  const sectionPattern = /\/\/\s*===\s*(FRONTEND|BACKEND|E2E)\s+TESTS?\s*===/gi;
  const matches = [...code.matchAll(sectionPattern)];

  const typeMap: Record<string, 'frontend' | 'backend' | 'e2e'> = {
    'FRONTEND': 'frontend',
    'BACKEND': 'backend',
    'E2E': 'e2e',
  };

  if (matches.length >= 2) {
    // Found section markers — split the code
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i + 1 < matches.length ? matches[i + 1].index! : code.length;
      const sectionCode = code.slice(start, end).trim();
      const sectionType = typeMap[matches[i][1].toUpperCase()] || 'frontend';

      const parsed = parseGeneratedCode(sectionCode, sectionType);
      results.push(...parsed);
    }
  } else {
    // No section markers found — split by describe blocks and infer types
    // or just create 3 test cases from the whole output
    const frontendTests = parseGeneratedCode(code, 'frontend');
    const backendTests = parseGeneratedCode(code, 'backend');
    const e2eTests = parseGeneratedCode(code, 'e2e');

    // Take the best parsing result
    if (frontendTests.length > 0) {
      // Assign types based on test titles/content
      const allParsed = [...frontendTests];
      for (const tc of allParsed) {
        const titleLower = tc.title.toLowerCase();
        const codeLower = tc.code.toLowerCase();
        if (titleLower.includes('e2e') || codeLower.includes('playwright') || codeLower.includes('page.goto')) {
          tc.type = 'e2e';
        } else if (titleLower.includes('api') || titleLower.includes('endpoint') || codeLower.includes('supertest') || codeLower.includes('request(')) {
          tc.type = 'backend';
        } else {
          tc.type = 'frontend';
        }
      }
      results.push(...allParsed);
    } else {
      // Fallback: split code into 3 roughly equal chunks
      const lines = code.split('\n');
      const chunkSize = Math.ceil(lines.length / 3);
      const types: Array<'frontend' | 'backend' | 'e2e'> = ['frontend', 'backend', 'e2e'];

      for (let i = 0; i < 3; i++) {
        const chunk = lines.slice(i * chunkSize, (i + 1) * chunkSize).join('\n').trim();
        if (chunk.length > 20) { // Skip empty/tiny chunks
          results.push({
            title: `${types[i].charAt(0).toUpperCase() + types[i].slice(1)} Test Suite`,
            code: chunk,
            type: types[i],
          });
        }
      }
    }
  }

  // If we still have no results, create a single test case
  if (results.length === 0) {
    results.push({
      title: 'Full Stack Test Suite',
      code: code,
      type: 'frontend',
    });
  }

  return results;
}

function parseGeneratedCode(
  rawCode: string,
  testType: 'frontend' | 'backend' | 'e2e'
): GeneratedTestCase[] {
  const cleanCode = rawCode
    .replace(/^```(?:typescript|javascript|python|ts|js)?\n?/gm, '')
    .replace(/\n?```$/gm, '')
    .trim();

  const testBlocks = splitTestBlocks(cleanCode);

  if (testBlocks.length === 0) {
    const title = inferTitleFromCode(cleanCode, testType);
    return [
      {
        title,
        code: cleanCode,
        type: testType,
      },
    ];
  }

  return testBlocks.map((block) => ({
    title: inferTitleFromCode(block, testType),
    code: block,
    type: testType,
  }));
}

function splitTestBlocks(code: string): string[] {
  const blocks: string[] = [];

  const describeRegex = /describe\s*\(/g;
  const matches = [...code.matchAll(describeRegex)];

  if (matches.length <= 1) return blocks;

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : code.length;
    blocks.push(code.slice(start, end).trim());
  }

  return blocks;
}

function inferTitleFromCode(
  code: string,
  testType: 'frontend' | 'backend' | 'e2e'
): string {
  const describeMatch = code.match(/describe\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (describeMatch) return describeMatch[1];

  const testMatch = code.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (testMatch) return testMatch[1];

  const defMatch = code.match(/def\s+test_(\w+)/);
  if (defMatch) return defMatch[1].replace(/_/g, ' ');

  const typeLabel =
    testType === 'frontend'
      ? 'Frontend'
      : testType === 'backend'
      ? 'Backend'
      : 'E2E';

  return `${typeLabel} Test Suite`;
}

export async function getProjectTestCases(projectId: string) {
  return db.testCase.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateTestCase(testCaseId: string, code: string) {
  return db.testCase.update({
    where: { id: testCaseId },
    data: { code },
  });
}

export async function deleteTestCase(testCaseId: string) {
  return db.testCase.delete({
    where: { id: testCaseId },
  });
}
