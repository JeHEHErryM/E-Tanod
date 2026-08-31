import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Card({
  title,
  subtitle,
  icon,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: CardProps) {
  const hasHeader = title || actions;
  return (
    <section className={`surface overflow-hidden ${className}`}>
      {hasHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-ink-100/70 px-5 py-4">
          <div className="flex items-center gap-3">
            {icon ? (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {icon}
              </span>
            ) : null}
            <div>
              {title ? <h2 className="text-base font-bold text-ink-900">{title}</h2> : null}
              {subtitle ? <p className="text-xs text-ink-500">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
