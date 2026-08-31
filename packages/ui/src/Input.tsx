import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, leading, trailing, hint, error, className = '', id, ...rest },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-400">
            {leading}
          </span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={`h-11 w-full rounded-xl border bg-white text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:outline-none disabled:bg-sand-50 disabled:text-ink-400 ${
            error
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
              : 'border-ink-200 focus:border-brand-500 focus:ring-brand-100'
          } ${leading ? 'pl-10' : 'px-3.5'} ${trailing ? 'pr-10' : ''} ${className}`}
          {...rest}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-3 flex items-center text-ink-400">{trailing}</span>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}
export function Textarea({ label, hint, error, className = '', id, ...rest }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-300 transition-colors focus:outline-none ${
          error
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
            : 'border-ink-200 focus:border-brand-500 focus:ring-brand-100'
        } ${className}`}
        {...rest}
      />
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="mt-1.5 text-xs text-ink-400">{hint}</p> : null}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}
export function Select({ label, children, className = '', id, ...rest }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700">
          {label}
        </label>
      ) : null}
      <select
        id={inputId}
        className={`h-11 w-full appearance-none rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-brand-100 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
