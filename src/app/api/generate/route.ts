import { NextRequest, NextResponse } from 'next/server';
import { generateTests } from '@/lib/testGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, testType, additionalInstructions } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const testCases = await generateTests({
      projectId,
      testType: testType || 'fullstack',
      additionalInstructions,
    });

    return NextResponse.json({
      success: true,
      testCases,
      count: testCases.length,
    });
  } catch (error) {
    console.error('Error generating tests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tests' },
      { status: 500 }
    );
  }
}
