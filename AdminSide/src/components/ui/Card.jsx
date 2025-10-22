import React from 'react';
import { cn } from '../../utils/cn';

const Card = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 border-b border-gray-100', className)}
    {...props}
  >
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6', className)}
    {...props}
  >
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

const CardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold text-gray-900', className)}
    {...props}
  >
    {children}
  </h3>
));

CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600', className)}
    {...props}
  >
    {children}
  </p>
));

CardDescription.displayName = 'CardDescription';

export { Card, CardHeader, CardContent, CardTitle, CardDescription };
