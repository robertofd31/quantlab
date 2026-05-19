import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-6 hover:border-border-light transition-all ${className}`}>
      {children}
    </div>
  );
}
