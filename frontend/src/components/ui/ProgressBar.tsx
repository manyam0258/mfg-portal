import clsx from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'green' | 'amber' | 'red' | 'brand';
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, color = 'brand', className, showLabel }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 100);

  const barColor = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-accent-500',
    brand: 'bg-brand-500',
  }[color];

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-brand-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400 w-8 text-right">{Math.round(pct)}%</span>
      )}
    </div>
  );
}
