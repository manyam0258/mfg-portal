import { type ReactNode } from 'react';
import { LABELS } from '@/constants/labels';

interface EmptyStateProps {
  message?: string;
  icon?: ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="mb-4 opacity-30">
        {icon ?? (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="currentColor" fillOpacity="0.1" />
            <path
              d="M16 32V20a2 2 0 012-2h12a2 2 0 012 2v12M12 32h24M20 26h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <p className="text-sm">{message ?? LABELS.loading}</p>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <div className="mb-4 text-accent-500">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
          <path d="M20 12v10M20 26v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm mb-4">{message ?? LABELS.error}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost text-xs">
          {LABELS.retry}
        </button>
      )}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm">{LABELS.loading}</p>
    </div>
  );
}
