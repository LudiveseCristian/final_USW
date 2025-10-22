import React from 'react';
import { cn } from '../../utils/cn';

const LoadingSpinner = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
          sizes[size]
        )}
      />
    </div>
  );
};

export default LoadingSpinner;
