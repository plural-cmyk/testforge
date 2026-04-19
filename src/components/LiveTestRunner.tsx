'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResultsBadge } from '@/components/ResultsBadge';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Terminal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LiveTest {
  id: string;
  title: string;
  type: 'frontend' | 'backend' | 'e2e';
  status: 'pending' | 'running' | 'pass' | 'fail' | 'flaky';
  duration?: number;
  errorMessage?: string;
}

interface LiveTestRunnerProps {
  tests: LiveTest[];
  onComplete?: (results: LiveTest[]) => void;
  isRunning: boolean;
}

export function LiveTestRunner({ tests, onComplete, isRunning }: LiveTestRunnerProps) {
  const [liveTests, setLiveTests] = useState<LiveTest[]>(Array.isArray(tests) ? tests.filter(Boolean) : []);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [executionState, setExecutionState] = useState<'idle' | 'running' | 'complete'>('idle');
  const testsRef = useRef(tests);
  const onCompleteRef = useRef(onComplete);
  testsRef.current = tests;
  onCompleteRef.current = onComplete;

  const startExecution = useCallback(() => {
    const currentTests = testsRef.current;
    setExecutionState('running');
    setLiveTests(currentTests);
    setConsoleLines(['TestForge — Starting test execution...', '']);
    setOverallProgress(0);

    let index = 0;

    function runNext() {
      const t = testsRef.current;
      if (index >= t.length) {
        setExecutionState('complete');
        return;
      }

      const test = t[index];

      setLiveTests((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, status: 'running' as const } : item
        )
      );
      setConsoleLines((prev) => [...prev, `--- Running: ${test.title} ---`]);

      const timeout = 800 + Math.random() * 1500;

      setTimeout(() => {
        const rand = Math.random();
        let status: 'pass' | 'fail' | 'flaky';
        let errorMessage: string | undefined;

        if (rand < 0.65) {
          status = 'pass';
        } else if (rand < 0.88) {
          status = 'fail';
          const errors = [
            'Expected element ".submit-btn" to be visible but it was not found in the DOM.',
            'API returned status 500 — internal server error.',
            'Assertion failed: expected "John" but received undefined.',
            'Timeout: Navigation to "/dashboard" exceeded 30000ms.',
          ];
          errorMessage = errors[Math.floor(Math.random() * errors.length)];
        } else {
          status = 'flaky';
          errorMessage = 'Test passed on retry. Possible timing issue detected.';
        }

        const duration = Math.round(200 + Math.random() * 3000);

        setLiveTests((prev) =>
          prev.map((item, i) =>
            i === index ? { ...item, status, duration, errorMessage } : item
          )
        );

        setConsoleLines((prev) => [
          ...prev,
          status === 'pass'
            ? `PASSED (${duration}ms)`
            : status === 'fail'
            ? `FAILED (${duration}ms) — ${errorMessage}`
            : `FLAKY (${duration}ms) — ${errorMessage}`,
        ]);

        setOverallProgress(((index + 1) / t.length) * 100);

        index++;

        if (index < t.length) {
          setTimeout(runNext, 200);
        } else {
          setExecutionState('complete');
          // Capture final state for callback
          setLiveTests((finalTests) => {
            onCompleteRef.current?.(finalTests);
            return finalTests;
          });
        }
      }, timeout);
    }

    runNext();
  }, []);

  // Auto-start when isRunning changes to true
  const triggered = useRef(false);
  if (isRunning && executionState === 'idle' && !triggered.current) {
    triggered.current = true;
    setTimeout(startExecution, 100);
  }
  if (!isRunning) {
    triggered.current = false;
  }

  const passed = liveTests.filter((t) => t.status === 'pass').length;
  const failed = liveTests.filter((t) => t.status === 'fail').length;
  const flaky = liveTests.filter((t) => t.status === 'flaky').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Test Execution</CardTitle>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> {passed}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" /> {failed}
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" /> {flaky}
              </span>
            </div>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-2">
          {liveTests.map((test, i) => (
            <div
              key={test.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                test.status === 'running'
                  ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950'
                  : test.status === 'pending'
                  ? 'border-border/50 bg-muted/30'
                  : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}</span>
                {test.status === 'running' && (
                  <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                )}
                <span className="text-sm font-medium">{test.title}</span>
                <span className="text-xs text-muted-foreground capitalize">{test.type}</span>
              </div>
              <div className="flex items-center gap-2">
                {test.duration && (
                  <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                )}
                <ResultsBadge status={test.status} size="sm" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Console Output</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48 w-full rounded-md bg-zinc-950 text-zinc-100 p-4">
            <div className="font-mono text-xs space-y-0.5">
              {consoleLines.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
              {executionState === 'running' && (
                <div className="flex items-center gap-1">
                  <span className="animate-pulse">▊</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
