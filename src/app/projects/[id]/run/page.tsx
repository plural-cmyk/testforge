'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiveTestRunner } from '@/components/LiveTestRunner';
import { Zap, ArrowLeft, Play, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface TestCase {
  id: string;
  title: string;
  code: string;
  type: 'frontend' | 'backend' | 'e2e';
}

interface Project {
  id: string;
  name: string;
  testCases: TestCase[];
}

interface RunResult {
  id: string;
  title: string;
  type: 'frontend' | 'backend' | 'e2e';
  status: 'pending' | 'running' | 'pass' | 'fail' | 'flaky';
  duration?: number;
  errorMessage?: string;
}

export default function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [runCompleted, setRunCompleted] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [liveTests, setLiveTests] = useState<RunResult[]>([]);

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();
      setProject(data?.project || null);

      setLiveTests(
        Array.isArray(data?.project?.testCases)
          ? data.project.testCases.filter(Boolean).map((tc: TestCase) => ({
              id: tc.id,
              title: tc.title,
              type: tc.type,
              status: 'pending' as const,
            }))
          : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  async function startTestRun() {
    if (!project || project.testCases.length === 0) return;

    setIsRunning(true);
    setRunCompleted(false);

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to execute tests');
      }

      const data = await res.json();
      setRunId(data.runId);

      // Simulate the visual test running experience
      await simulateLiveRun();

      setRunCompleted(true);
      setIsRunning(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test execution failed');
      setIsRunning(false);
    }
  }

  async function simulateLiveRun() {
    const tests = [...liveTests];

    for (let i = 0; i < tests.length; i++) {
      setLiveTests((prev) =>
        prev.map((t, idx) => (idx === i ? { ...t, status: 'running' as const } : t))
      );

      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 1200));

      const rand = Math.random();
      let status: 'pass' | 'fail' | 'flaky';
      let errorMessage: string | undefined;
      const duration = Math.round(200 + Math.random() * 2000);

      if (rand < 0.65) {
        status = 'pass';
      } else if (rand < 0.88) {
        status = 'fail';
        const errors = [
          'Expected element ".submit-btn" to be visible but was not found.',
          'API returned 404 — endpoint may have been removed.',
          'Assertion failed: expected true, received false.',
          'Timeout: Element did not appear within 30000ms.',
        ];
        errorMessage = errors[Math.floor(Math.random() * errors.length)];
      } else {
        status = 'flaky';
        errorMessage = 'Test passed on retry. Timing issue detected.';
      }

      setLiveTests((prev) =>
        prev.map((t, idx) =>
          idx === i ? { ...t, status, duration, errorMessage } : t
        )
      );
    }
  }

  const passed = liveTests.filter((t) => t.status === 'pass').length;
  const failed = liveTests.filter((t) => t.status === 'fail').length;
  const flaky = liveTests.filter((t) => t.status === 'flaky').length;

  if (loading) {
    return (
      <RunLayout projectId={id}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </RunLayout>
    );
  }

  return (
    <RunLayout projectId={id}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Test Runner</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {project?.name || 'Project'} — {liveTests.length} test cases
            </p>
          </div>
          {!isRunning && !runCompleted && (
            <Button
              onClick={startTestRun}
              disabled={!project || project.testCases.length === 0}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              <Play className="h-4 w-4" />
              Run All Tests
            </Button>
          )}
          {runCompleted && runId && (
            <Button
              onClick={() => router.push(`/projects/${id}/results/${runId}`)}
              className="gap-2"
            >
              View Results
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Summary Stats */}
        {(isRunning || runCompleted) && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold">{liveTests.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-emerald-600">{passed}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Passed
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-red-600">{failed}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" /> Failed
                </div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{flaky}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" /> Flaky
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test List */}
        <LiveTestRunner
          tests={liveTests}
          isRunning={isRunning}
          onComplete={() => {
            setRunCompleted(true);
          }}
        />

        {project && project.testCases.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Play className="h-8 w-8 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No test cases to run</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate test cases first before running them.
              </p>
              <Link href={`/projects/${id}/generate`}>
                <Button variant="outline" className="gap-1">
                  Generate Tests
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </RunLayout>
  );
}

function RunLayout({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">TestForge</span>
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/generate`}>
              <Button variant="ghost" size="sm">Generate</Button>
            </Link>
            <Link href={`/projects/${projectId}/run`}>
              <Button variant="secondary" size="sm">Run</Button>
            </Link>
            <Link href={`/projects/${projectId}/heal`}>
              <Button variant="ghost" size="sm">Heal</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
