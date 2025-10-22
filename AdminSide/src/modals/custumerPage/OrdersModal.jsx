// src/modals/OrdersModal.jsx

import React, { useState, useMemo } from 'react';
import { X, Package, ArrowUp, ArrowDown } from 'lucide-react';

// Custom hook for sorting data
const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

const OrdersModal = ({ show, onClose, selectedCustomer, customerOrders }) => {
  const { items, requestSort, sortConfig } = useSortableData(customerOrders);

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

  const getClassNamesFor = (name) => {
    if (!sortConfig) {
      return;
    }
    return sortConfig.key === name ? sortConfig.direction : undefined;
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
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('product')}
                    >
                      <div className="flex items-center">
                        Product
                        {getClassNamesFor('product') === 'ascending' && <ArrowUp className="h-4 w-4 ml-1" />}
                        {getClassNamesFor('product') === 'descending' && <ArrowDown className="h-4 w-4 ml-1" />}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('category')}
                    >
                      <div className="flex items-center">
                        Category
                        {getClassNamesFor('category') === 'ascending' && <ArrowUp className="h-4 w-4 ml-1" />}
                        {getClassNamesFor('category') === 'descending' && <ArrowDown className="h-4 w-4 ml-1" />}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('price')}
                    >
                      <div className="flex items-center">
                        Price
                        {getClassNamesFor('price') === 'ascending' && <ArrowUp className="h-4 w-4 ml-1" />}
                        {getClassNamesFor('price') === 'descending' && <ArrowDown className="h-4 w-4 ml-1" />}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Address
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {getClassNamesFor('status') === 'ascending' && <ArrowUp className="h-4 w-4 ml-1" />}
                        {getClassNamesFor('status') === 'descending' && <ArrowDown className="h-4 w-4 ml-1" />}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort('formattedDate')}
                    >
                      <div className="flex items-center">
                        Date
                        {getClassNamesFor('formattedDate') === 'ascending' && <ArrowUp className="h-4 w-4 ml-1" />}
                        {getClassNamesFor('formattedDate') === 'descending' && <ArrowDown className="h-4 w-4 ml-1" />}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.productImage && (
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={order.productImage}
                                alt={order.product}
                              />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{order.product}</div>
                            <div className="text-sm text-gray-500">Order ID: {order.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600 font-bold">{formatPrice(order.price)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrderStatusColor(order.status)}`}
                        >
                          {order.status?.toUpperCase() || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.formattedDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No orders found for this user.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersModal;