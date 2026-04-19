import { NextRequest, NextResponse } from 'next/server';
import { getTestRunResults } from '@/lib/playwright';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getTestRunResults(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching test run results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test run results' },
      { status: 500 }
    );
  }
}
