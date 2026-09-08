import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type Variant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'
  | 'dark'
  | 'soft'
  | 'outline'
  | 'light'
  | 'onDark';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  // Solid, high-contrast action buttons
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900 shadow-brand-900/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  dark: 'bg-ink-900 text-white hover:bg-ink-950',
  light: 'bg-sand-50 text-brand-900 hover:bg-white',
  // Tinted / outlined controls on light surfaces
  secondary: 'bg-brand-50 text-brand-900 border border-brand-300 hover:bg-brand-100',
  soft: 'bg-ink-100 text-ink-900 hover:bg-ink-200',
  outline: 'border border-ink-300 bg-white text-brand-800 hover:bg-brand-50 hover:border-brand-400',
  ghost: 'bg-transparent text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  // Translucent control for dark brand surfaces
  onDark: 'border border-white/25 bg-white/10 text-white hover:bg-white/20',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  xl: 'h-14 px-8 text-base gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}