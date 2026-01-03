'use client';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

export default function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="mb-2 flex items-center justify-between text-sm">
          {label && (
            <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
          )}
          {showPercentage && (
            <span className="font-medium text-zinc-900 dark:text-white">
              {percentage}% ({current}/{total})
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all duration-300 dark:bg-white"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
