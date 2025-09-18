import { useAlert } from '../contexts/alertContext';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { X } from 'lucide-react';

const AlertModal = () => {
    const { alert, hideAlert } = useAlert();

    if (!alert) return null;

    const { type, message, onConfirm, confirmText, onCancel } = alert;

    const handleConfirm = () => {
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
        hideAlert();
    };

    const handleCancel = () => {
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
        hideAlert();
    };

    const isConfirm = type === 'confirm';

    // Define styles and icons based on alert type, using the new color scheme
    const alertConfig = {
        success: {
            icon: <CheckCircle2 className="h-10 w-10 text-green-600" />,
            title: 'Success!',
            mainButton: 'bg-green-600 hover:bg-green-700',
            bg: 'bg-white', // Consistent with ProductsModal
        },
        error: {
            icon: <XCircle className="h-10 w-10 text-red-600" />,
            title: 'Error',
            mainButton: 'bg-red-600 hover:bg-red-700',
            bg: 'bg-white',
        },
        info: {
            icon: <Info className="h-10 w-10 text-blue-600" />,
            title: 'Information',
            mainButton: 'bg-blue-600 hover:bg-blue-700',
            bg: 'bg-white',
        },
        confirm: {
            icon: <AlertTriangle className="h-10 w-10 text-yellow-500" />,
            title: 'Are you sure?',
            mainButton: 'bg-green-600 hover:bg-green-700',
            bg: 'bg-white',
        },
    };

    const config = alertConfig[type] || alertConfig.info;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm"
            aria-modal="true"
            role="dialog"
            onClick={(e) => {
                // Check if the click is on the backdrop
                if (e.target.classList.contains('fixed')) {
                    hideAlert();
                }
            }}
        >
            <div className="bg-white rounded-xl max-w-sm w-full shadow-2xl">
                <div className="p-8">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                            {config.title}
                        </h2>
                        <button
                            onClick={hideAlert}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4">
                            {config.icon}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mt-2">{message}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-6 justify-end">
                        {isConfirm && (
                            <button
                                onClick={handleCancel}
                                className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            className={`px-6 py-3 rounded-xl font-semibold text-white transition-colors ${config.mainButton}`}
                        >
                            {isConfirm ? confirmText : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;