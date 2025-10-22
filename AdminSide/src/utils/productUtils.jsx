import {
  Star,
  Zap,
  CheckCircle,
  Clock,
  Shirt,
  Tag,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';

export const formatPrice = (price) => {
  if (price === undefined || price === null) {
    return 'N/A';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(price);
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'sold':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getConditionIcon = (condition) => {
  switch (condition) {
    case 'new':
      return <Star className="h-4 w-4 text-gray-500" />;
    case 'good':
      return <CheckCircle className="h-4 w-4 text-gray-500" />;
    case 'used':
      return <Zap className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
};

export const getTimeLeft = (endTime) => {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;

  if (diff <= 0) {
    return 'Bid Ended';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${days}d ${hours}h ${minutes}m`;
};