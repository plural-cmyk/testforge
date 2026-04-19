import { NextRequest, NextResponse } from 'next/server';
import { healFailingTest, healAllFailingTests } from '@/lib/selfHealer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testRunId, testCaseId, healAll } = body;

    if (!testRunId) {
      return NextResponse.json(
        { error: 'testRunId is required' },
        { status: 400 }
      );
    }

    if (healAll) {
      const results = await healAllFailingTests(testRunId);
      return NextResponse.json({
        success: true,
        healedCount: results.length,
        results,
      });
    }

    if (!testCaseId) {
      return NextResponse.json(
        { error: 'testCaseId is required when not using healAll' },
        { status: 400 }
      );
    }

    const result = await healFailingTest(testRunId, testCaseId);
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error self-healing tests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to heal tests' },
      { status: 500 }
    );
  }
}
