'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Edit, Trash2, Code, Globe, Server } from 'lucide-react';

interface TestCardProps {
  id: string;
  title: string;
  type: 'frontend' | 'backend' | 'e2e';
  code: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRun?: (id: string) => void;
}

const typeConfig = {
  frontend: {
    icon: Code,
    label: 'Frontend',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  backend: {
    icon: Server,
    label: 'Backend',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  e2e: {
    icon: Globe,
    label: 'E2E',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
};

export function TestCard({ id, title, type, code, onEdit, onDelete, onRun }: TestCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const codePreview = code.split('\n').slice(0, 5).join('\n');

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium line-clamp-1">{title}</CardTitle>
          </div>
          <Badge variant="secondary" className={config.color}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-24 font-mono">
          <code>{codePreview}</code>
        </pre>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="sm" onClick={() => onRun?.(id)} className="gap-1">
            <Play className="h-3 w-3" />
            Run
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit?.(id)} className="gap-1">
            <Edit className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(id)}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
