import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={['v2-input', className].filter(Boolean).join(' ')} {...props} />;
}
