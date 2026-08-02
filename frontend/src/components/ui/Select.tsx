import type { SelectHTMLAttributes } from 'react';

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={['v2-select', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </select>
  );
}
