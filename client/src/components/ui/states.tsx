import { cn } from '@/lib/utils';
import { AlertCircle, PackageOpen, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-16 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon ?? <PackageOpen className="h-7 w-7" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-16 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-danger">
        <AlertCircle className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors duration-200 ease-nova hover:bg-accent/5"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function NoResults({ onClear, className }: { onClear?: () => void; className?: string }) {
  return (
    <EmptyState
      icon={<SearchX className="h-7 w-7" aria-hidden />}
      title="No products found"
      description="Try adjusting your filters or search term."
      action={
        onClear && (
          <button
            onClick={onClear}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-[filter] duration-200 ease-nova hover:brightness-110"
          >
            Clear all filters
          </button>
        )
      }
      className={className}
    />
  );
}
