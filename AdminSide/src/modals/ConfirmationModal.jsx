// src/modals/ConfirmationModal.jsx
import { AlertTriangle, X } from 'lucide-react';

/**
 * A reusable modal for user confirmation of an action.
 * @param {object} props
 * @param {boolean} props.showModal - Controls the visibility of the modal.
 * @param {Function} props.setShowModal - Function to hide the modal.
 * @param {string} props.title - The title of the confirmation message.
 * @param {string} props.message - The main message asking for confirmation.
 * @param {Function} props.onConfirm - Callback function to execute on confirmation.
 * @param {Function} props.onCancel - Callback function to execute on cancel.
 */
const ConfirmationModal = ({ showModal, setShowModal, title, message, onConfirm, onCancel }) => {
  if (!showModal) {
    return null;
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    setShowModal(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setShowModal(false);
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        // Close modal if user clicks on the backdrop
        if (e.target.classList.contains('fixed')) {
          handleCancel();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto transform transition-all animate-fadeIn">
        <div className="p-8">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-7 w-7 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{title || 'Confirm Action'}</h3>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors bg-red-600 hover:bg-red-700"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;