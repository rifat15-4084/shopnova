import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

const baseField =
  'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-[border-color,box-shadow] duration-200 ease-nova focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60';

const errorField = 'border-danger focus:border-danger';

export interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldWrapper({ label, error, hint, htmlFor, required, children, className }: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, id, className, required, ...props },
  ref
) {
  const inputId = id ?? props.name;

  const field = (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          {leftIcon}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn(baseField, error && errorField, leftIcon && 'pl-10', className)}
        {...props}
      />
    </div>
  );

  if (!label) return field;
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={inputId ?? ''} required={required}>
      {field}
    </FieldWrapper>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className, required, ...props },
  ref
) {
  const fieldId = id ?? props.name;
  const field = (
    <textarea
      ref={ref}
      id={fieldId}
      aria-invalid={Boolean(error)}
      rows={props.rows ?? 4}
      className={cn(baseField, error && errorField, 'resize-y', className)}
      {...props}
    />
  );

  if (!label) return field;
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId ?? ''} required={required}>
      {field}
    </FieldWrapper>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, id, className, required, ...props },
  ref
) {
  const fieldId = id ?? props.name;
  const field = (
    <select
      ref={ref}
      id={fieldId}
      aria-invalid={Boolean(error)}
      className={cn(baseField, error && errorField, 'appearance-none pr-8', className)}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  if (!label) return field;
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId ?? ''} required={required}>
      {field}
    </FieldWrapper>
  );
});
