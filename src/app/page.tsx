'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Shield,
  Code,
  Brain,
  ArrowRight,
  CheckCircle2,
  Play,
  Sparkles,
  Terminal,
  GitBranch,
  Globe,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">TestForge</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/projects/new">
              <Button size="sm" className="gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                Start Testing
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background" />
          <div className="container relative mx-auto px-4 py-20 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI-Powered Test Automation
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Test your entire app{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  with AI
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Paste your repo URL, live app URL, or API spec — and TestForge automatically
                generates, runs, and maintains comprehensive test suites for your entire
                application.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/projects/new">
                  <Button
                    size="lg"
                    className="gap-2 text-base px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white h-12"
                  >
                    <Play className="h-5 w-5" />
                    Start Testing Free
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="outline" size="lg" className="gap-2 text-base h-12">
                    See How It Works
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Everything You Need to Ship with Confidence</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From unit tests to end-to-end flows, TestForge covers your entire testing
                lifecycle with AI that learns your codebase.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={Brain}
                title="AI Test Generation"
                description="Our AI analyzes your codebase, API specs, or live URLs to generate comprehensive, runnable test suites tailored to your tech stack."
              />
              <FeatureCard
                icon={Code}
                title="Frontend & Backend"
                description="Generate component tests, API contract tests, database integrity checks, and full-stack E2E flows — all from a single tool."
              />
              <FeatureCard
                icon={Shield}
                title="Self-Healing Tests"
                description="When your app changes, broken tests automatically repair themselves. TestForge detects selector changes, API schema shifts, and more."
              />
              <FeatureCard
                icon={Terminal}
                title="Live Test Execution"
                description="Watch tests execute in real-time with detailed console output, per-test status indicators, and instant failure analysis."
              />
              <FeatureCard
                icon={GitBranch}
                title="Stack Auto-Detection"
                description="Automatically detect your framework, language, and testing tools from your repo, live app headers, or API specifications."
              />
              <FeatureCard
                icon={Globe}
                title="Full Coverage Reports"
                description="Get detailed pass/fail/flaky breakdowns, coverage percentages, and plain-English failure explanations for every test run."
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground text-lg">Three steps to comprehensive test coverage</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <StepCard
                step={1}
                title="Connect Your App"
                description="Paste your GitHub repo URL, live application URL, or OpenAPI spec. TestForge auto-detects your tech stack."
              />
              <StepCard
                step={2}
                title="AI Generates Tests"
                description="Our AI analyzes your codebase and generates comprehensive test suites covering frontend, backend, and end-to-end scenarios."
              />
              <StepCard
                step={3}
                title="Run & Self-Heal"
                description="Execute tests with live results. When tests break due to app changes, TestForge automatically suggests and applies fixes."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-emerald-500 to-teal-600">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to ship bug-free code?
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of developers who trust TestForge to keep their applications tested and reliable.
            </p>
            <Link href="/projects/new">
              <Button
                size="lg"
                className="gap-2 text-base px-8 bg-white text-emerald-700 hover:bg-emerald-50 h-12"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold">TestForge</span>
          </div>
          <p className="text-xs text-muted-foreground">
            AI-powered test automation for modern development teams.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
          <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-4">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto">
        <span className="text-white font-bold text-lg">{step}</span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
