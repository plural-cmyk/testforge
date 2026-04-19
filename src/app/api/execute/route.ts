import { NextRequest, NextResponse } from 'next/server';
import { executeTestRun } from '@/lib/playwright';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const result = await executeTestRun(projectId);

    return NextResponse.json({
      success: true,
      runId: result.runId,
      summary: result.summary,
      results: result.results,
    });
  } catch (error) {
    console.error('Error executing tests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute tests' },
      { status: 500 }
    );
  }
}
