import React from 'react';
import { cn } from '@/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, hover = false, ...props }, ref) => {
    const paddingRegex = /(?:^|\s)p[trblxy]?-/;
    const childrenArray = React.Children.toArray(children);
    const hasSections = childrenArray.some((child) => {
      if (!React.isValidElement(child)) return false;
      const displayName = (child.type as any)?.displayName;
      return displayName === 'CardHeader' || displayName === 'CardContent' || displayName === 'CardFooter';
    });
    const hasInnerPadding = childrenArray.some((child) => {
      if (!React.isValidElement(child)) return false;
      const childClass = (child.props as any)?.className;
      return typeof childClass === 'string' && paddingRegex.test(childClass);
    });
    const autoPadding = !hasSections && !hasInnerPadding ? 'p-4 sm:p-5' : '';

    return (
      <div
        ref={ref}
        className={cn(
          'min-w-0 rounded-2xl border border-emerald-100/80 bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur',
          autoPadding,
          hover && 'card-hover cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
