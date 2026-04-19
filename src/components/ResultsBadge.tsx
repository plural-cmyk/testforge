'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Clock, MinusCircle } from 'lucide-react';

type ResultStatus = 'pass' | 'fail' | 'flaky' | 'skip' | 'running' | 'pending';

interface ResultsBadgeProps {
  status: ResultStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<
  ResultStatus,
  {
    icon: React.ElementType;
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    colorClasses: string;
  }
> = {
  pass: {
    icon: CheckCircle2,
    label: 'Passed',
    variant: 'secondary',
    colorClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-200',
  },
  fail: {
    icon: XCircle,
    label: 'Failed',
    variant: 'destructive',
    colorClasses: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200',
  },
  flaky: {
    icon: AlertTriangle,
    label: 'Flaky',
    variant: 'secondary',
    colorClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200',
  },
  skip: {
    icon: MinusCircle,
    label: 'Skipped',
    variant: 'outline',
    colorClasses: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200',
  },
  running: {
    icon: Clock,
    label: 'Running',
    variant: 'secondary',
    colorClasses: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 border-sky-200',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    variant: 'outline',
    colorClasses: 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200',
  },
};

const sizeMap = {
  sm: 'text-xs h-5 px-1.5',
  md: 'text-xs h-6 px-2',
  lg: 'text-sm h-7 px-3',
};

export function ResultsBadge({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}: ResultsBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`${config.colorClasses} ${sizeMap[size]} gap-1 font-medium ${className}`}
    >
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'}`} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
