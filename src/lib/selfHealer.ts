import { analyzeTestFailure, selfHealTest } from './claude';
import { db } from './db';

export interface HealResult {
  testCaseId: string;
  oldCode: string;
  healedCode: string;
  changeDescription: string;
  explanation: string;
}

export async function healFailingTest(
  testRunId: string,
  testCaseId: string
): Promise<HealResult> {
  const testResult = await db.testResult.findFirst({
    where: {
      testRunId,
      testCaseId,
      status: 'fail',
    },
    include: {
      testCase: true,
    },
  });

  if (!testResult) {
    throw new Error('No failing test result found for this test case in this run.');
  }

  const testCase = testResult.testCase;
  const errorMessage = testResult.errorMessage || 'Unknown error';

  const analysis = await analyzeTestFailure(
    testCase.code,
    errorMessage
  );

  const healing = await selfHealTest(
    testCase.code,
    errorMessage
  );

  await db.testCase.update({
    where: { id: testCaseId },
    data: { code: healing.healedCode },
  });

  await db.testResult.update({
    where: { id: testResult.id },
    data: {
      healedFrom: testCase.code,
    },
  });

  return {
    testCaseId,
    oldCode: testCase.code,
    healedCode: healing.healedCode,
    changeDescription: healing.changeDescription,
    explanation: analysis.explanation,
  };
}

export async function healAllFailingTests(
  testRunId: string
): Promise<HealResult[]> {
  const failingResults = await db.testResult.findMany({
    where: {
      testRunId,
      status: 'fail',
    },
    include: {
      testCase: true,
    },
  });

  if (failingResults.length === 0) {
    return [];
  }

  const healResults: HealResult[] = [];

  for (const result of failingResults) {
    try {
      const healResult = await healFailingTest(testRunId, result.testCaseId);
      healResults.push(healResult);
    } catch (error) {
      console.error(`Failed to heal test ${result.testCaseId}:`, error);
      healResults.push({
        testCaseId: result.testCaseId,
        oldCode: result.testCase.code,
        healedCode: result.testCase.code,
        changeDescription: 'Auto-heal failed. Manual review required.',
        explanation: `The self-healing process encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return healResults;
}

export async function getHealHistory(projectId: string) {
  const healedResults = await db.testResult.findMany({
    where: {
      healedFrom: { not: null },
    },
    include: {
      testCase: {
        include: {
          project: true,
        },
      },
      testRun: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return healedResults.filter((r) => r.testCase.projectId === projectId);
}
