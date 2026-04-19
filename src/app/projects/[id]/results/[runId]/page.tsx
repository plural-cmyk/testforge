'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResultsBadge } from '@/components/ResultsBadge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Zap,
  ArrowLeft,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  FileJson,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface TestResult {
  id: string;
  status: string;
  errorMessage: string | null;
  duration: number;
  healedFrom: string | null;
  testCase: {
    id: string;
    title: string;
    code: string;
    type: string;
  };
}

interface TestRunData {
  run: {
    id: string;
    startedAt: string;
    completedAt: string | null;
    status: string;
    summary: string | null;
  };
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    flaky: number;
    skipped: number;
    duration: number;
    coverage?: number;
  };
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id: projectId, runId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<TestRunData | null>(null);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState<string | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [runId]);

  async function fetchResults() {
    try {
      setLoading(true);
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) throw new Error('Failed to fetch results');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  async function handleHealTest(testCaseId: string) {
    setHealing(testCaseId);
    try {
      const res = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRunId: runId, testCaseId }),
      });

      if (!res.ok) throw new Error('Failed to heal test');

      await fetchResults();
    } catch (err) {
      console.error('Heal failed:', err);
    } finally {
      setHealing(null);
    }
  }

  async function handleHealAll() {
    setHealing('all');
    try {
      const res = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRunId: runId, healAll: true }),
      });

      if (!res.ok) throw new Error('Failed to heal tests');

      await fetchResults();
    } catch (err) {
      console.error('Heal all failed:', err);
    } finally {
      setHealing(null);
    }
  }

  function exportJSON() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testforge-results-${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    if (!data) return;
    const summaryText = [
      `TestForge - Test Run Report`,
      `========================`,
      `Run ID: ${data.run.id}`,
      `Status: ${data.run.status}`,
      `Started: ${new Date(data.run.startedAt).toLocaleString()}`,
      data.run.completedAt ? `Completed: ${new Date(data.run.completedAt).toLocaleString()}` : '',
      ``,
      `Summary`,
      `-------`,
      `Total: ${data.summary.total}`,
      `Passed: ${data.summary.passed}`,
      `Failed: ${data.summary.failed}`,
      `Flaky: ${data.summary.flaky}`,
      `Coverage: ${data.summary.coverage || 0}%`,
      ``,
      `Results`,
      `-------`,
      ...data.results.map(
        (r) =>
          `[${r.status.toUpperCase()}] ${r.testCase.title} (${r.duration}ms)${
            r.errorMessage ? '\n  Error: ' + r.errorMessage : ''
          }`
      ),
    ].join('\n');

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testforge-results-${runId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <ResultsLayout projectId={projectId}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </ResultsLayout>
    );
  }

  if (!data) {
    return (
      <ResultsLayout projectId={projectId}>
        <div className="text-center py-20">
          <p className="text-destructive">Results not found</p>
          <Link href={`/projects/${projectId}/run`}>
            <Button variant="outline" className="mt-4">Back to Runner</Button>
          </Link>
        </div>
      </ResultsLayout>
    );
  }

  const passRate = data.summary.total > 0
    ? Math.round((data.summary.passed / data.summary.total) * 100)
    : 0;

  return (
    <ResultsLayout projectId={projectId}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Test Results</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Run completed {data.run.completedAt ? new Date(data.run.completedAt).toLocaleString() : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportJSON} className="gap-1">
              <FileJson className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
              <FileText className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/run`)}
              className="gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-run
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard label="Total" value={data.summary.total} icon={Clock} />
          <SummaryCard
            label="Passed"
            value={data.summary.passed}
            icon={CheckCircle2}
            color="emerald"
          />
          <SummaryCard
            label="Failed"
            value={data.summary.failed}
            icon={XCircle}
            color="red"
          />
          <SummaryCard
            label="Flaky"
            value={data.summary.flaky}
            icon={AlertTriangle}
            color="amber"
          />
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{data.summary.coverage || 0}%</div>
              <div className="text-xs text-muted-foreground">Coverage</div>
              <Progress value={data.summary.coverage || 0} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Pass Rate */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Pass Rate</span>
              <span className="text-sm font-bold">{passRate}%</span>
            </div>
            <Progress value={passRate} className="h-3" />
          </CardContent>
        </Card>

        {/* Heal All */}
        {data.summary.failed > 0 && (
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/50">
            <CardContent className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium">
                    {data.summary.failed} failing test{data.summary.failed > 1 ? 's' : ''} detected
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use AI self-healing to automatically fix broken selectors and assertions
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleHealAll}
                  disabled={healing === 'all'}
                  size="sm"
                  className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {healing === 'all' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Heal All
                </Button>
                <Link href={`/projects/${projectId}/heal`}>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Test Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.results.map((result) => (
              <div key={result.id} className="border rounded-lg">
                <button
                  onClick={() =>
                    setExpandedTest(expandedTest === result.id ? null : result.id)
                  }
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedTest === result.id ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{result.testCase.title}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {result.testCase.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                    <ResultsBadge status={result.status as 'pass' | 'fail' | 'flaky'} size="sm" />
                    {result.status === 'fail' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHealTest(result.testCase.id);
                        }}
                        disabled={healing === result.testCase.id}
                        className="gap-1 text-amber-600 hover:text-amber-700"
                      >
                        {healing === result.testCase.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Heal
                      </Button>
                    )}
                  </div>
                </button>

                {expandedTest === result.id && (
                  <div className="border-t p-4 space-y-3">
                    {result.errorMessage && (
                      <div className="bg-red-50 dark:bg-red-950 rounded-md p-3">
                        <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                          Failure Reason:
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {result.errorMessage}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Test Code:</p>
                      <ScrollArea className="max-h-48">
                        <pre className="text-xs font-mono bg-muted/50 rounded-md p-3">
                          {result.testCase.code}
                        </pre>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ResultsLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 border-emerald-200 dark:border-emerald-800',
    red: 'text-red-600 border-red-200 dark:border-red-800',
    amber: 'text-amber-600 border-amber-200 dark:border-amber-800',
  };

  return (
    <Card className={color ? colorMap[color] || '' : ''}>
      <CardContent className="pt-4 pb-3 text-center">
        <div className={`text-2xl font-bold ${color ? colorMap[color]?.split(' ')[0] : ''}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsLayout({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}/run`} className="text-muted-foreground hover:text-foreground">
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
              <Button variant="ghost" size="sm">Run</Button>
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
