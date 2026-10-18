import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

export interface RatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function Rating({ value, count, size = 'md', className }: RatingProps) {
  const starSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={`Rated ${value} out of 5`}>
      <div className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, value - star + 1));
          return (
            <span key={star} className="relative inline-flex">
              <Star className={cn(starSize, 'text-muted-foreground/40')} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn(starSize, 'fill-amber-400 text-amber-400')} />
              </span>
            </span>
          );
        })}
      </div>
      <span className={cn('font-medium text-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {value.toFixed(1)}
      </span>
      {typeof count === 'number' && (
        <span className={cn('text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
          ({count})
        </span>
      )}
    </div>
  );
}
