import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            block w-full rounded-md border px-3 py-2 text-sm shadow-sm
            placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            ${error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-gray-300'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
