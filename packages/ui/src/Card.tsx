import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {title ? <div className="border-b border-gray-100 px-5 py-4 text-base font-semibold text-gray-800">{title}</div> : null}
      <div className="p-5">{children}</div>
    </div>
  );
}