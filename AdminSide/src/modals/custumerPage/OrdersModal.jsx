// src/modals/OrdersModal.jsx

import { X, Package } from 'lucide-react';

const OrdersModal = ({ show, onClose, selectedCustomer, customerOrders }) => {
  if (!show || !selectedCustomer) return null;

  const formatPrice = (price) => {
    return `₱${price?.toLocaleString() || '0'}`;
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'mine':
        return 'bg-blue-100 text-blue-800';
      case 'grab':
        return 'bg-yellow-100 text-yellow-800';
      case 'steal':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">Order History - {selectedCustomer.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            {customerOrders.length > 0 ? (
              customerOrders.map((order) => (
                <div key={order.id} className="bg-green-50 rounded-lg p-4 transition-shadow hover:shadow-md">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex space-x-4 mb-4 sm:mb-0">
                      {order.productImage && (
                        <img
                          src={order.productImage}
                          alt={order.product}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900">{order.product}</h4>
                        <p className="text-sm text-gray-600">Category: {order.category}</p>
                        <p className="text-sm text-gray-600">Order ID: {order.id.substring(0, 8)}...</p>
                        <p className="text-sm text-gray-600">Date: {order.formattedDate}</p>
                      </div>
                    </div>
                    <div className="text-right sm:self-start">
                      <p className="font-bold text-green-600 text-xl">{formatPrice(order.price)}</p>
                      <p className="text-sm text-gray-500">{order.address}</p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)} mt-2 inline-block`}
                      >
                        {order.status?.toUpperCase() || "PENDING"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No orders found for this user.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersModal;