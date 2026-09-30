import { type ReactNode } from 'react';
import { LABELS } from '@/constants/labels';

type StatusType =
  | 'Not Started'
  | 'In Process'
  | 'Completed'
  | 'Stopped'
  | 'Closed'
  | 'Cancelled'
  | 'Draft'
  | 'Open'
  | 'Work In Progress'
  | 'Material Transferred'
  | 'On Hold'
  | 'Submitted'
  | string;

function getPillCategory(status: string): 'success' | 'warning' | 'danger' | 'draft' {
  switch (status) {
    case 'Completed':
    case 'Submitted':
      return 'success';
    case 'In Process':
    case 'Open':
    case 'Work In Progress':
    case 'Material Transferred':
    case 'On Hold':
      return 'warning';
    case 'Cancelled':
    case 'Failed':
    case 'Stopped':
      return 'danger';
    case 'Draft':
    case 'Not Started':
    case 'Closed':
    default:
      return 'draft';
  }
}

interface StatusPillProps {
  status: StatusType;
  children?: ReactNode;
  className?: string;
}

export function StatusPill({ status, children, className = '' }: StatusPillProps) {
  const category = getPillCategory(status);

  const categoryClasses = {
    success: 'status-pill-success',
    warning: 'status-pill-warning',
    danger:  'status-pill-danger',
    draft:   'status-pill-draft',
  }[category];

  const dotClasses = {
    success: 'bg-[var(--badge-success-text)]',
    warning: 'bg-[var(--badge-warning-text)]',
    danger:  'bg-[var(--badge-danger-text)]',
    draft:   'bg-[var(--badge-draft-text)]',
  }[category];

  const label =
    children ??
    LABELS.status[status as keyof typeof LABELS.status] ??
    status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClasses}`} />
      <span>{label}</span>
    </span>
  );
}
