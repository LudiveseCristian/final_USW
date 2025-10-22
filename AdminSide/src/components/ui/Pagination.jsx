import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage, 
  totalItems,
  showInfo = true,
  className 
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {showInfo && (
        <div className="text-sm text-gray-700">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      )}
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'p-2 rounded-lg transition-colors',
            currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getVisiblePages().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              page === currentPage
                ? 'bg-primary text-white'
                : page === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'p-2 rounded-lg transition-colors',
            currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
