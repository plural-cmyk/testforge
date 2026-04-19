'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowLeft, GitBranch, Globe, FileJson, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

type InputMethod = 'repo' | 'url' | 'spec';

export default function NewProjectPage() {
  const router = useRouter();
  const [inputMethod, setInputMethod] = useState<InputMethod>('repo');
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [apiSpecUrl, setApiSpecUrl] = useState('');
  const [scope, setScope] = useState<'frontend' | 'backend' | 'fullstack'>('fullstack');
  const [detectedStack, setDetectedStack] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function detectStack() {
    setDetecting(true);
    setDetectedStack(null);
    setError(null);

    try {
      const res = await fetch('/api/detect-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: inputMethod === 'repo' ? repoUrl : undefined,
          appUrl: inputMethod === 'url' ? appUrl : undefined,
          apiSpecUrl: inputMethod === 'spec' ? apiSpecUrl : undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to detect stack');
      const data = await res.json();
      setDetectedStack(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stack detection failed');
    } finally {
      setDetecting(false);
    }
  }

  async function createProject() {
    if (!name) {
      setError('Project name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          repoUrl: repoUrl || undefined,
          appUrl: appUrl || undefined,
          apiSpecUrl: apiSpecUrl || undefined,
          stack: detectedStack || undefined,
          scope,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const data = await res.json();
      router.push(`/projects/${data.project.id}/generate`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  const inputMethods: { key: InputMethod; icon: React.ElementType; label: string; placeholder: string }[] = [
    { key: 'repo', icon: GitBranch, label: 'GitHub Repo', placeholder: 'https://github.com/user/repo' },
    { key: 'url', icon: Globe, label: 'Live App URL', placeholder: 'https://myapp.example.com' },
    { key: 'spec', icon: FileJson, label: 'API Spec URL', placeholder: 'https://api.example.com/openapi.json' },
  ];

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
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect your application to start generating AI-powered tests
          </p>
        </div>

        <div className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="My Awesome App"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Input Method Selection */}
          <div className="space-y-2">
            <Label>How do you want to connect your app?</Label>
            <div className="grid grid-cols-3 gap-3">
              {inputMethods.map((method) => {
                const Icon = method.icon;
                const isActive = inputMethod === method.key;
                return (
                  <button
                    key={method.key}
                    onClick={() => {
                      setInputMethod(method.key);
                      setDetectedStack(null);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                        : 'border-border hover:border-emerald-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="url">
              {inputMethod === 'repo' ? 'Repository URL' : inputMethod === 'url' ? 'Application URL' : 'API Spec URL'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="url"
                placeholder={inputMethods.find((m) => m.key === inputMethod)?.placeholder}
                value={inputMethod === 'repo' ? repoUrl : inputMethod === 'url' ? appUrl : apiSpecUrl}
                onChange={(e) => {
                  if (inputMethod === 'repo') setRepoUrl(e.target.value);
                  else if (inputMethod === 'url') setAppUrl(e.target.value);
                  else setApiSpecUrl(e.target.value);
                  setDetectedStack(null);
                }}
              />
              <Button
                onClick={detectStack}
                disabled={detecting || (!repoUrl && !appUrl && !apiSpecUrl)}
                variant="outline"
                className="gap-1 shrink-0"
              >
                {detecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Detect
              </Button>
            </div>
          </div>

          {/* Detected Stack */}
          {detectedStack && (
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/50">
              <CardContent className="flex items-center gap-3 pt-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Stack Detected</p>
                  <p className="text-xs text-muted-foreground">{detectedStack}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Scope */}
          <div className="space-y-2">
            <Label>Test Scope</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['frontend', 'backend', 'fullstack'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium capitalize transition-colors ${
                    scope === s
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'border-border hover:border-emerald-300 text-muted-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-4">
            <Link href="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
              onClick={createProject}
              disabled={creating || !name}
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Create & Generate Tests
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
