import type { HTMLAttributes, ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, className = '', variant = 'default', ...props }: BadgeProps) {
  const classes = [
    'v2-badge',
    variant !== 'default' ? `v2-badge--${variant}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
