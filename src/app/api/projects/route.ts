import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { testCases: true, testRuns: true },
        },
        testRuns: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, repoUrl, appUrl, apiSpecUrl, stack, scope, userId } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (!repoUrl && !appUrl && !apiSpecUrl) {
      return NextResponse.json(
        { error: 'At least one of repoUrl, appUrl, or apiSpecUrl is required' },
        { status: 400 }
      );
    }

    const defaultUserId = userId || 'default-user';

    let existingUser = await db.user.findUnique({
      where: { id: defaultUserId },
    });

    if (!existingUser) {
      existingUser = await db.user.create({
        data: {
          id: defaultUserId,
          email: 'dev@testforge.dev',
          name: 'TestForge Developer',
        },
      });
    }

    const project = await db.project.create({
      data: {
        name,
        repoUrl: repoUrl || null,
        appUrl: appUrl || null,
        apiSpecUrl: apiSpecUrl || null,
        stack: stack || null,
        scope: scope || 'fullstack',
        userId: defaultUserId,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
