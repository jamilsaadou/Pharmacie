import React from 'react';
import { cn } from '@/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, icon, ...props }, ref) => {
    const generatedId=React.useId();
    const id=props.id||generatedId;
    return (
      <div className="min-w-0 space-y-2">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-gray-400">
                {icon}
              </div>
            </div>
          )}
          <input
            id={id}
            aria-invalid={!!error}
            aria-describedby={error?id+'-error':props['aria-describedby']}
            type={type}
            className={cn(
              'flex min-h-12 w-full rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-10',
              error && 'border-red-500 focus:ring-red-500/40 focus:border-red-500',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p id={id+'-error'} role="alert" className="text-sm text-red-700">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
