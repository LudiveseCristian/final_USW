import React from 'react';
import { cn } from '../../utils/cn';

const StatusBadge = ({ status, variant = 'default', className }) => {
  const getStatusConfig = (status) => {
    const statusMap = {
      // Order statuses
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'shipped': { color: 'bg-blue-100 text-blue-800', label: 'Shipped' },
      'delivered': { color: 'bg-green-100 text-green-800', label: 'Delivered' },
      'cancelled': { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      'rated': { color: 'bg-purple-100 text-purple-800', label: 'Rated' },
      
      // Product statuses
      'available': { color: 'bg-green-100 text-green-800', label: 'Available' },
      'sold': { color: 'bg-red-100 text-red-800', label: 'Sold' },
      'reserved': { color: 'bg-yellow-100 text-yellow-800', label: 'Reserved' },
      
      // Bidding statuses
      'mine': { color: 'bg-blue-100 text-blue-800', label: 'Mine' },
      'grab': { color: 'bg-yellow-100 text-yellow-800', label: 'Grab' },
      'steal': { color: 'bg-red-100 text-red-800', label: 'Steal' },
      
      // Customer statuses
      'active': { color: 'bg-green-100 text-green-800', label: 'Active' },
      'inactive': { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      
      // Default
      'default': { color: 'bg-gray-100 text-gray-800', label: status }
    };

    return statusMap[status?.toLowerCase()] || statusMap['default'];
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide',
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;
