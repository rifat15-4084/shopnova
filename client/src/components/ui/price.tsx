import { cn, formatPrice } from '@/lib/utils';
import { useCurrencyStore } from '@/stores/currency.store';

interface PriceProps {
  amount: number | undefined | null;
  compareAt?: number | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** hide the original price when there is a discount */
  hideOriginalWhenDiscounted?: boolean;
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
};

const compareSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/** Money formatter bound to the active display currency (USD base, BDT converted). */
export function Price({
  amount,
  compareAt,
  className,
  size = 'md',
  hideOriginalWhenDiscounted,
}: PriceProps) {
  const currency = useCurrencyStore((s) => s.currency);
  const discounted = typeof compareAt === 'number' && compareAt > (amount ?? 0);

  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span className={cn('font-semibold text-foreground', sizeClasses[size])}>
        {formatPrice(amount ?? 0, currency)}
      </span>
      {discounted && !hideOriginalWhenDiscounted && (
        <s className={cn('text-muted-foreground', compareSizeClasses[size])}>
          {formatPrice(compareAt, currency)}
        </s>
      )}
    </span>
  );
}
