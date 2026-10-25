import React from 'react';
import { cn } from '@/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    const generatedId=React.useId(),id=props.id||generatedId;
    return (
      <div className="min-w-0 space-y-2">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={error?id+'-error':props['aria-describedby']}
          className={cn(
            'flex min-h-12 w-full rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 text-sm text-gray-900 shadow-sm ring-offset-white transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus-visible:ring-red-500/40 focus-visible:border-red-500',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={id+'-error'} role="alert" className="text-sm text-red-700">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
