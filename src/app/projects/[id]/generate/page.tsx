'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TestCard } from '@/components/TestCard';
import {
  Zap,
  ArrowLeft,
  Loader2,
  Sparkles,
  Play,
  Brain,
  Code,
  Server,
  Globe,
  Plus,
} from 'lucide-react';

interface TestCase {
  id: string;
  title: string;
  code: string;
  type: 'frontend' | 'backend' | 'e2e';
  filePath: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  repoUrl: string | null;
  appUrl: string | null;
  stack: string | null;
  scope: string;
  testCases: TestCase[];
}

export default function GeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [testType, setTestType] = useState<'frontend' | 'backend' | 'e2e' | 'fullstack'>('fullstack');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [aiSteps, setAiSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  async function generateTests() {
    if (!project) return;
    setGenerating(true);
    setError(null);
    setAiSteps([]);

    const steps = [
      'Analyzing project structure and tech stack...',
      'Identifying components, routes, and API endpoints...',
      'Designing test strategy for ' + testType + ' scope...',
      'Generating test cases with AI...',
      'Validating generated test code...',
      'Saving test cases to project...',
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));
      setAiSteps((prev) => [...prev, steps[i]]);
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          testType,
          additionalInstructions: additionalInstructions || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate tests');
      }

      setAiSteps((prev) => [...prev, 'Test generation complete!']);

      await fetchProject();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteTest(testCaseId: string) {
    try {
      await fetch(`/api/test-cases/${testCaseId}`, { method: 'DELETE' });
      await fetchProject();
    } catch (err) {
      console.error('Failed to delete test case:', err);
    }
  }

  function handleRunProject() {
    router.push(`/projects/${id}/run`);
  }

  if (loading) {
    return (
      <ProjectLayout projectId={id}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-muted-foreground">Loading project...</span>
        </div>
      </ProjectLayout>
    );
  }

  if (!project) {
    return (
      <ProjectLayout projectId={id}>
        <div className="text-center py-20">
          <p className="text-destructive">Project not found</p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout projectId={id}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Generation Controls */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-600" />
                AI Test Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Test Scope</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'frontend' as const, icon: Code, label: 'Frontend' },
                    { key: 'backend' as const, icon: Server, label: 'Backend' },
                    { key: 'e2e' as const, icon: Globe, label: 'E2E' },
                    { key: 'fullstack' as const, icon: Plus, label: 'Full Stack' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setTestType(item.key)}
                        className={`flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-colors ${
                          testType === item.key
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'border-border hover:border-emerald-300 text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Additional Instructions (optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="E.g., Focus on authentication flows, test the checkout process with Stripe integration..."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <Button
                onClick={generateTests}
                disabled={generating}
                className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate Tests'}
              </Button>
            </CardContent>
          </Card>

          {/* AI Steps */}
          {aiSteps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Loader2 className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : 'hidden'} text-emerald-600`} />
                  AI Thinking Process
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 text-xs mt-0.5 shrink-0">
                        {i < aiSteps.length - 1 ? '✓' : '→'}
                      </span>
                      <span className="text-xs text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Generated Tests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Generated Test Cases
              {project.testCases.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {project.testCases.length}
                </Badge>
              )}
            </h2>
            {project.testCases.length > 0 && (
              <Button onClick={handleRunProject} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                <Play className="h-3.5 w-3.5" />
                Run All Tests
              </Button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {project.testCases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No tests generated yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Select your test scope and click &quot;Generate Tests&quot; to let AI create comprehensive test suites for your project.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(project.testCases || []).filter(Boolean).map((tc) => (
                <TestCard
                  key={tc.id}
                  id={tc.id}
                  title={tc.title}
                  type={tc.type as 'frontend' | 'backend' | 'e2e'}
                  code={tc.code}
                  onDelete={handleDeleteTest}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}

function ProjectLayout({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
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
