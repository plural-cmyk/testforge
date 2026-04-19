import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProjectRuns } from '@/lib/playwright';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      );
    }

    const runs = await getProjectRuns(projectId);
    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error fetching test runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test runs' },
      { status: 500 }
    );
  }
}
