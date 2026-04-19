'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeDiffViewer } from '@/components/CodeDiffViewer';
import { ResultsBadge } from '@/components/ResultsBadge';
import {
  Zap,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TestTube2,
  History,
} from 'lucide-react';

interface HealItem {
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
  testRun: {
    id: string;
    startedAt: string;
  };
}

export default function HealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [healItems, setHealItems] = useState<HealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState<string | null>(null);
  const [healResults, setHealResults] = useState<
    Record<string, { oldCode: string; newCode: string; explanation: string; changeDescription: string }>
  >({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealData();
  }, [projectId]);

  async function fetchHealData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();

      const failedTests: HealItem[] = [];
      const runs = Array.isArray(data?.project?.testRuns) ? data.project.testRuns : [];
      for (const run of runs) {
        if (!run?.id) continue;
        const runRes = await fetch(`/api/runs/${run.id}`);
        if (runRes.ok) {
          const runData = await runRes.json();
          const results = Array.isArray(runData?.results) ? runData.results : [];
          for (const result of results) {
            if (result?.status === 'fail' && result?.testCase && result?.testRun) {
              failedTests.push(result);
            }
          }
        }
      }

      setHealItems(failedTests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load heal data');
    } finally {
      setLoading(false);
    }
  }

  async function handleHeal(testRunId: string, testCaseId: string) {
    setHealing(testCaseId);
    try {
      const res = await fetch('/api/heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRunId, testCaseId }),
      });

      if (!res.ok) throw new Error('Failed to heal test');

      const data = await res.json();
      setHealResults((prev) => ({
        ...prev,
        [testCaseId]: data.result,
      }));
    } catch (err) {
      console.error('Heal failed:', err);
    } finally {
      setHealing(null);
    }
  }

  async function handleHealAll() {
    setHealing('all');
    const testRunMap = new Map<string, string>();

    for (const item of healItems) {
      if (!healResults[item.testCase.id]) {
        testRunMap.set(item.testCase.id, item.testRun.id);
      }
    }

    for (const [testCaseId, testRunId] of testRunMap) {
      await handleHeal(testRunId, testCaseId);
    }

    setHealing(null);
  }

  if (loading) {
    return (
      <HealLayout projectId={projectId}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      </HealLayout>
    );
  }

  return (
    <HealLayout projectId={projectId}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Self-Healing
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered test repair — automatically fix broken selectors, assertions, and API contracts
            </p>
          </div>
          {healItems.length > 0 && (
            <Button
              onClick={handleHealAll}
              disabled={healing === 'all'}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {healing === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Heal All Failing Tests
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* No Failing Tests */}
        {healItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">All Tests Passing</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No failing tests need healing. Run your test suite to generate results, or check back after a test run.
              </p>
              <Link href={`/projects/${projectId}/run`}>
                <Button variant="outline" className="mt-4 gap-1">
                  <TestTube2 className="h-4 w-4" />
                  Run Tests
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {healItems.map((item) => {
              if (!item || !item.testCase || !item.testRun) return null;
              return (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ResultsBadge status="fail" size="sm" />
                      <CardTitle className="text-base">{item.testCase.title}</CardTitle>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.testCase.type}
                      </Badge>
                    </div>
                    {!healResults[item.testCase.id] && (
                      <Button
                        onClick={() => handleHeal(item.testRun.id, item.testCase.id)}
                        disabled={healing === item.testCase.id}
                        size="sm"
                        className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {healing === item.testCase.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Self-Heal
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Error Message */}
                  {item.errorMessage && (
                    <div className="bg-red-50 dark:bg-red-950 rounded-md p-3">
                      <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                        Failure Reason:
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {item.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Run Info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <History className="h-3 w-3" />
                    <span>
                      From run {item.testRun.id.slice(0, 8)}... — {new Date(item.testRun.startedAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Heal Result / Diff */}
                  {healResults[item.testCase.id] && (
                    <CodeDiffViewer
                      oldCode={healResults[item.testCase.id].oldCode}
                      newCode={healResults[item.testCase.id].newCode}
                      changeDescription={healResults[item.testCase.id].changeDescription}
                      onApply={() => {
                        // The heal has already been applied by the API
                      }}
                    />
                  )}

                  {/* Original Code */}
                  {!healResults[item.testCase.id] && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Current Test Code:</p>
                      <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto max-h-32 overflow-y-auto">
                        {item.testCase.code}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
            })}
          </div>
        )}
      </div>
    </HealLayout>
  );
}

function HealLayout({ projectId, children }: { projectId: string; children: React.ReactNode }) {
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
              <Button variant="ghost" size="sm">Run</Button>
            </Link>
            <Link href={`/projects/${projectId}/heal`}>
              <Button variant="secondary" size="sm">Heal</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
