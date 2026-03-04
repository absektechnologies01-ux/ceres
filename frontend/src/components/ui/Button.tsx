import { type ButtonHTMLAttributes } from 'react';
import Spinner from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-dark focus:ring-primary disabled:opacity-60',
  secondary:
    'bg-white text-primary border border-primary hover:bg-primary-light focus:ring-primary disabled:opacity-60',
  ghost:
    'bg-transparent text-primary hover:bg-primary-light focus:ring-primary disabled:opacity-60',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-md
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" className="text-current" />}
      {children}
    </button>
  );
}
