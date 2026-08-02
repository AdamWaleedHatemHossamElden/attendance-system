import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  const classes = [
    'v2-button',
    variant !== 'default' ? `v2-button--${variant}` : '',
    size !== 'md' ? `v2-button--${size}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
