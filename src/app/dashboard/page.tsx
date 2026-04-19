'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResultsBadge } from '@/components/ResultsBadge';
import {
  Plus,
  Zap,
  FolderOpen,
  Play,
  Clock,
  ArrowRight,
  Trash2,
  Loader2,
  AlertCircle,
  TestTube2,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  repoUrl: string | null;
  appUrl: string | null;
  stack: string | null;
  scope: string;
  createdAt: string;
  _count: {
    testCases: number;
    testRuns: number;
  };
  testRuns: Array<{
    id: string;
    status: string;
    startedAt: string;
    summary: string | null;
  }>;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects.filter(Boolean) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function deleteProject(id: string) {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function getLastRunStatus(project: Project): string | null {
    if (!project.testRuns || project.testRuns.length === 0) return null;
    return project.testRuns[0]?.status ?? null;
  }

  function getLastRunSummary(project: Project): { passed: number; failed: number; flaky: number } | null {
    if (!project.testRuns || project.testRuns.length === 0 || !project.testRuns[0]?.summary) return null;
    try {
      return JSON.parse(project.testRuns[0].summary);
    } catch {
      return null;
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-3 text-muted-foreground">Loading projects...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchProjects} variant="outline">
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4">
            <TestTube2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first project to start generating AI-powered tests for your application.
          </p>
          <Link href="/projects/new">
            <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
              <Plus className="h-4 w-4" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            if (!project) return null;
            const lastRunStatus = getLastRunStatus(project);
            const summary = getLastRunSummary(project);

            return (
              <Card
                key={project.id}
                className="group hover:shadow-lg transition-all hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{project.name}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        {project.stack && (
                          <Badge variant="secondary" className="text-xs">
                            {project.stack}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {project.scope}
                        </Badge>
                      </div>
                    </div>
                    {lastRunStatus && (
                      <ResultsBadge
                        status={lastRunStatus === 'passed' ? 'pass' : lastRunStatus === 'failed' ? 'fail' : 'running'}
                        size="sm"
                        showLabel={false}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.repoUrl && (
                    <div className="text-xs text-muted-foreground truncate">
                      {project.repoUrl}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TestTube2 className="h-3 w-3" />
                      {project._count?.testCases ?? 0} tests
                    </span>
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {project._count?.testRuns ?? 0} runs
                    </span>
                  </div>

                  {summary && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-600">{summary.passed} passed</span>
                      {summary.failed > 0 && (
                        <span className="text-red-600">{summary.failed} failed</span>
                      )}
                      {summary.flaky > 0 && (
                        <span className="text-amber-600">{summary.flaky} flaky</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/projects/${project.id}/generate`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        Generate Tests
                      </Button>
                    </Link>
                    <Link href={`/projects/${project.id}/run`} className="flex-1">
                      <Button size="sm" className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Play className="h-3 w-3" />
                        Run
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProject(project.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">TestForge</span>
            </Link>
            <Badge variant="secondary" className="hidden sm:inline-flex">Dashboard</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/projects/new">
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-3.5 w-3.5" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Projects</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and test your applications
            </p>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
