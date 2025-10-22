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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        // Close modal if user clicks on the backdrop
        if (e.target.classList.contains('fixed')) {
          handleCancel();
        }
      }}
    >
      <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {title || 'Confirm Action'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          {/* Content */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mt-2">{message}</p>
          </div>
          {/* Action Buttons */}
          <div className="flex space-x-4 pt-6 justify-end">
            <button
              onClick={handleCancel}
              className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
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