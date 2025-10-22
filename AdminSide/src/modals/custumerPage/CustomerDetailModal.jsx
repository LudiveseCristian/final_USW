// src/modals/CustomerDetailModal.jsx

import { X, Send, Package, Edit, Trash } from 'lucide-react';

const CustomerDetailModal = ({ show, onClose, selectedCustomer, onSendEmail, onViewOrders, onEditProfile, onDeleteCustomer }) => {
  if (!show || !selectedCustomer) return null;

  // A helper function to dynamically set the status text color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'new':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to format the price
  const formatPrice = (price) => {
    return `₱${price?.toLocaleString() || '0'}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
        
        {/* Header Section with Profile Picture and Details */}
        <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-green-300 to-green-500 p-8 flex items-end">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-4 z-10">
            {selectedCustomer.photoURL ? (
              <img
                src={selectedCustomer.photoURL}
                alt={selectedCustomer.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center ring-4 ring-white shadow-lg">
                <span className="text-white font-semibold text-2xl">
                  {selectedCustomer.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white mb-0.5">{selectedCustomer.name}</h3>
              <p className="text-white/80">{selectedCustomer.email}</p>
            </div>
          </div>
        </div>

        {/* Main Content Section */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <p className="text-gray-900 font-medium">{selectedCustomer.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900 font-medium">{selectedCustomer.address}</p>
              </div>
            </div>

            {/* Order History and Stats */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Order History</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Total Orders</p>
                  <p className="text-2xl font-bold text-green-900">{selectedCustomer.totalOrders}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Total Spent</p>
                  <p className="text-2xl font-bold text-green-900">{formatPrice(selectedCustomer.totalSpent)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Last Order</p>
                  <p className="text-2xl font-bold text-green-900">{selectedCustomer.lastOrder}</p>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {selectedCustomer.preferences.map((pref, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {pref}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => onSendEmail(selectedCustomer)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Send Email</span>
              </button>
              <button
                onClick={() => onViewOrders(selectedCustomer)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center space-x-2"
              >
                <Package className="h-4 w-4" />
                <span>View Orders</span>
              </button>
              <button
                onClick={() => onDeleteCustomer(selectedCustomer)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <Trash className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;