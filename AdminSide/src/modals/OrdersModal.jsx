import React from 'react';

// Helper function to format the date string/timestamp
const formatModalDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    let dateString;

    // Handle Firestore Timestamp object or convert to Date string
    if (dateValue && dateValue.toDate) {
        dateString = dateValue.toDate().toISOString();
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        dateString = dateValue;
    } else {
        return 'N/A';
    }

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'N/A';
    }
};

// Helper function to get status color (based on your previous component's logic)
const getStatusColor = (status) => {
    switch (status) {
        case 'shipped':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'delivered':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'rated':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'pending_confirmation':
        case 'pending':
        default:
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
};


const OrdersModal = ({ order, onClose }) => {
  if (!order) return null; // Don't render if there's no order

    const address = order.deliveryAddress;
    // Assume finalBidAmount is available as 'price' or 'winningBid' if this modal is used broadly
    const displayPrice = order.finalBidAmount || order.price || order.winningBid;
    const displayStatus = order.orderStatus || order.status;


  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-lg w-full transform transition-all">
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-2xl font-bold text-gray-900">Order Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium w-32">Order ID:</span>
            <span className="font-mono text-sm text-gray-700">{order.id}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium w-32">Customer ID:</span>
            <span className="font-semibold text-gray-900">{order.userId || order.customerId || 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium w-32">Product:</span>
            <span className="font-semibold text-gray-900">{order.productName || order.product || order.title || 'N/A'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium w-32">Price:</span>
            <span className="text-lg font-bold text-green-600">₱{displayPrice?.toLocaleString() || '0'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium w-32">Status:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(displayStatus)}`}>
              {displayStatus}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium w-32">Date:</span>
            <span className="text-sm text-gray-700">
              {formatModalDate(order.date || order.createdAt || order.orderDate)}
            </span>
          </div>

          {/* Corrected Delivery Address Display */}
          <div className="flex flex-col space-y-2 pt-2">
            <span className="text-gray-500 font-medium">Delivery Address:</span>
            {address ? (
                <div className="text-gray-700 bg-gray-100 p-3 rounded-md space-y-1 text-sm">
                    <div className='font-semibold'>{address.fullName || order.winnerName || 'N/A'}</div>
                    <div>{address.streetAddress}, {address.barangay}</div>
                    <div>{address.city}, {address.province} {address.postalCode}</div>
                    {address.phoneNumber && <div>Phone: {address.phoneNumber}</div>}
                    {address.landmark && <div className='italic text-xs'>Landmark: {address.landmark}</div>}
                    {address.deliveryNotes && <div className='italic text-xs text-red-600'>Notes: {address.deliveryNotes}</div>}
                </div>
            ) : (
                <p className="text-gray-700 bg-gray-100 p-3 rounded-md">No delivery address details provided.</p>
            )}
          </div>
          {/* End Corrected Delivery Address Display */}
          
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdersModal;