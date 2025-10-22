import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  className,
  showCloseButton = true 
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className={cn(
          'bg-white rounded-xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-hidden',
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
