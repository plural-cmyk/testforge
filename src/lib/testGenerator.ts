import { generateTestCode, rateLimitDelay } from './claude';
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

  const testTypes: Array<'frontend' | 'backend' | 'e2e'> =
    testType === 'fullstack'
      ? ['frontend', 'backend', 'e2e']
      : [testType];

  const allTests: GeneratedTestCase[] = [];

  for (let typeIndex = 0; typeIndex < testTypes.length; typeIndex++) {
    // Add delay between sequential AI calls to avoid rate limits
    // (skip delay before the first call)
    if (typeIndex > 0) {
      await rateLimitDelay();
    }

    const currentType = testTypes[typeIndex];
    const rawCode = await generateTestCode({
      repoStructure: repoStructure || undefined,
      apiSpec: apiSpec || project.apiSpecUrl || undefined,
      appUrl: appUrl || project.appUrl || undefined,
      framework: frameworkDescription,
      testType: currentType,
      additionalInstructions: additionalInstructions || undefined,
    });

    const testCases = parseGeneratedCode(rawCode, currentType);
    allTests.push(...testCases);
  }

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
