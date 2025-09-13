import { useAlert } from '../contexts/alertContext';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

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
    const isInfo = type === 'info';
    const isError = type === 'error';
    const isSuccess = type === 'success';

    // Define styles and icons based on alert type
    const alertConfig = {
        success: {
            icon: <CheckCircle2 className="h-7 w-7 text-green-500" />,
            title: 'Success!',
            mainButton: 'bg-green-600 hover:bg-green-700',
        },
        error: {
            icon: <XCircle className="h-7 w-7 text-red-500" />,
            title: 'Error',
            mainButton: 'bg-red-600 hover:bg-red-700',
        },
        info: {
            icon: <Info className="h-7 w-7 text-blue-500" />,
            title: 'Information',
            mainButton: 'bg-blue-600 hover:bg-blue-700',
        },
        confirm: {
            icon: <AlertTriangle className="h-7 w-7 text-yellow-500" />,
            title: 'Confirmation',
            mainButton: 'bg-red-600 hover:bg-red-700',
        },
    };

    const config = alertConfig[type] || alertConfig.info;

    return (
        <div
            className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
            onClick={(e) => {
                if (e.target.classList.contains('fixed')) {
                    hideAlert();
                }
            }}
        >
            <div className={`bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto transform transition-all animate-fadeIn`}>
                <div className="p-8">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="flex-shrink-0">
                            {config.icon}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{isConfirm ? 'Are you sure?' : config.title}</h3>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-6 pl-11">{message}</p>
                    <div className="flex justify-end space-x-3">
                        {isConfirm && (
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            className={`px-5 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${config.mainButton}`}
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