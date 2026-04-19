import { NextRequest, NextResponse } from 'next/server';
import {
  detectStackFromRepo,
  detectStackFromUrl,
  detectStackFromApiSpec,
  formatStackSummary,
} from '@/lib/stackDetector';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, appUrl, apiSpecUrl } = body;

    if (!repoUrl && !appUrl && !apiSpecUrl) {
      return NextResponse.json(
        { error: 'At least one of repoUrl, appUrl, or apiSpecUrl is required' },
        { status: 400 }
      );
    }

    let stack;

    if (repoUrl) {
      stack = await detectStackFromRepo(repoUrl);
    } else if (appUrl) {
      stack = await detectStackFromUrl(appUrl);
    } else if (apiSpecUrl) {
      stack = await detectStackFromApiSpec(apiSpecUrl);
    }

    if (!stack) {
      return NextResponse.json(
        { error: 'Could not detect stack' },
        { status: 400 }
      );
    }

    const summary = formatStackSummary(stack);

    return NextResponse.json({
      stack,
      summary,
    });
  } catch (error) {
    console.error('Error detecting stack:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to detect stack' },
      { status: 500 }
    );
  }
}
