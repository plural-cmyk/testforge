'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Copy, Check } from 'lucide-react';

interface CodeDiffViewerProps {
  oldCode: string;
  newCode: string;
  oldTitle?: string;
  newTitle?: string;
  changeDescription?: string;
  onApply?: () => void;
  onReject?: () => void;
}

function getDiffLines(oldCode: string, newCode: string) {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');

  type LineInfo = {
    type: 'unchanged' | 'removed' | 'added';
    content: string;
    lineNum: number;
  };

  const lines: LineInfo[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      lines.push({ type: 'unchanged', content: oldLine || '', lineNum: i + 1 });
    } else {
      if (oldLine !== undefined) {
        lines.push({ type: 'removed', content: oldLine, lineNum: i + 1 });
      }
      if (newLine !== undefined) {
        lines.push({ type: 'added', content: newLine, lineNum: i + 1 });
      }
    }
  }

  return lines;
}

export function CodeDiffViewer({
  oldCode,
  newCode,
  oldTitle = 'Original Code',
  newTitle = 'Healed Code',
  changeDescription,
  onApply,
  onReject,
}: CodeDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'diff' | 'side-by-side'>('diff');
  const [copied, setCopied] = useState(false);

  const diffLines = getDiffLines(oldCode, newCode);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(newCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineClass = (type: string) => {
    switch (type) {
      case 'removed':
        return 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300';
      case 'added':
        return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      default:
        return '';
    }
  };

  const linePrefix = (type: string) => {
    switch (type) {
      case 'removed':
        return '-';
      case 'added':
        return '+';
      default:
        return ' ';
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Self-Heal Diff</CardTitle>
            {changeDescription && (
              <p className="text-sm text-muted-foreground">{changeDescription}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'diff' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('diff')}
            >
              Diff
            </Button>
            <Button
              variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('side-by-side')}
            >
              Side by Side
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {viewMode === 'diff' ? (
          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Changes</span>
              <Badge variant="secondary" className="text-xs">
                {diffLines.filter((l) => l.type !== 'unchanged').length} changes
              </Badge>
            </div>
            <div className="font-mono text-xs overflow-x-auto max-h-80 overflow-y-auto">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex ${lineClass(line.type)} border-b border-border/30`}
                >
                  <span className="w-10 shrink-0 text-center text-muted-foreground/50 border-r border-border/30 select-none">
                    {linePrefix(line.type)}
                  </span>
                  <span className="px-3 py-0.5 whitespace-pre">{line.content}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="border rounded-md overflow-hidden">
              <div className="bg-red-50 dark:bg-red-950 px-4 py-2 text-xs font-medium text-red-800 dark:text-red-200">
                {oldTitle}
              </div>
              <pre className="font-mono text-xs p-3 overflow-x-auto max-h-80 overflow-y-auto">
                {oldCode}
              </pre>
            </div>
            <div className="border rounded-md overflow-hidden">
              <div className="bg-emerald-50 dark:bg-emerald-950 px-4 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                {newTitle}
              </div>
              <pre className="font-mono text-xs p-3 overflow-x-auto max-h-80 overflow-y-auto">
                {newCode}
              </pre>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          {onApply && (
            <Button onClick={onApply} className="gap-2">
              <Check className="h-4 w-4" />
              Apply Fix
            </Button>
          )}
          {onReject && (
            <Button variant="outline" onClick={onReject}>
              Reject
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 ml-auto">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy New Code'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
