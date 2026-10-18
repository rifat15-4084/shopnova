import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function Spinner({ className }: { className?: string }) {
  return (
    <span role="status" className="inline-flex">
      <Loader2 className={cn('h-5 w-5 animate-spin text-accent', className)} aria-hidden />
      <span className="sr-only">Loading</span>
    </span>
  );
}
