import { X, Trash } from 'lucide-react';

const DeleteCustomerModal = ({ show, onClose, onConfirm, customer }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-destructive">Confirm Delete</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-6">
            <p className="text-foreground">
              Are you sure you want to delete user <strong>"{customer.name}"</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-foreground hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <Trash className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCustomerModal;