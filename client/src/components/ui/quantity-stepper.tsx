import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, disabled, size = 'md' }: QuantityStepperProps) {
  const btn =
    'flex items-center justify-center text-foreground transition-colors duration-150 ease-nova hover:bg-accent/10 disabled:pointer-events-none disabled:opacity-40';
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        className={`${btn} rounded-l-lg ${dim}`}
      >
        <Minus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
      </button>
      <span
        className={`min-w-10 text-center font-semibold text-foreground ${size === 'sm' ? 'text-sm' : 'text-base'}`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        className={`${btn} rounded-r-lg ${dim}`}
      >
        <Plus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
      </button>
    </div>
  );
}
