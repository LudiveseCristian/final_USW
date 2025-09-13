import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  getDocs,
  doc,
  updateDoc,
  where,
  deleteDoc,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAlert } from "../contexts/alertContext";
import OrdersModal from "../modals/OrdersModal";
import EmailModal from "../modals/EmailModal";

const PAGE_SIZE = 8;
const DEBOUNCE_DELAY = 500;

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [lastDoc, setLastDoc] = useState(null);
  const [firstDoc, setFirstDoc] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    declined: 0,
    grab: 0,
    sold: 0,
  });

  // Use the useAlert hook to get the showAlert function
  const { showAlert } = useAlert();

  const handleDetailsClick = (order) => {
    setSelectedOrder(order);
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleEmailClick = (customerEmail) => {
    if (customerEmail) {
      setEmailRecipient(customerEmail);
      setIsEmailModalOpen(true);
    } else {
      showAlert("error", "No email address available for this customer.");
    }
  };

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
    setEmailRecipient("");
  };

  const statusTransitions = {
    pending: [
      { newStatus: "confirmed", label: "✅ Confirm Order", color: "bg-green-500", icon: "✅" },
      { newStatus: "declined", label: "❌ Decline Order", color: "bg-red-500", icon: "❌" },
    ],
    confirmed: [
      { newStatus: "grab", label: "🚚 Ready for Pickup", color: "bg-blue-500", icon: "🚚" },
    ],
    grab: [
      { newStatus: "sold", label: "💰 Mark as Completed", color: "bg-purple-500", icon: "💰" },
    ],
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    if (dateValue.toDate) {
      return dateValue.toDate().toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return new Date(dateValue).toLocaleString();
  };

  const getRelativeTime = (dateValue) => {
    if (!dateValue) return "Unknown";
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateValue);
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "⏳", label: "Pending" },
      confirmed: { color: "bg-green-100 text-green-800 border-green-200", icon: "✅", label: "Confirmed" },
      declined: { color: "bg-red-100 text-red-800 border-red-200", icon: "❌", label: "Declined" },
      grab: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: "🚚", label: "Ready for Pickup" },
      sold: { color: "bg-purple-100 text-purple-800 border-purple-200", icon: "💰", label: "Completed" },
    };
    return statusMap[status] || statusMap.pending;
  };

  const fetchAllStats = async () => {
    try {
      const ordersRef = collection(db, "orders");
      const statuses = ["pending", "confirmed", "declined", "grab", "sold"];

      const counts = await Promise.all(
        statuses.map(async (status) => {
          const q = query(ordersRef, where("status", "==", status));
          const snapshot = await getCountFromServer(q);
          return { status, count: snapshot.data().count };
        })
      );

      const totalSnapshot = await getCountFromServer(ordersRef);
      const totalCount = totalSnapshot.data().count;

      const newStats = { total: totalCount };
      counts.forEach(({ status, count }) => {
        newStats[status] = count;
      });

      setOrderStats(newStats);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchOrders = async (direction = "initial") => {
    setLoading(true);
    try {
      const ordersRef = collection(db, "orders");
      let filters = [];

      // Add status filter
      if (statusFilter !== "all") {
        filters.push(where("status", "==", statusFilter));
      }

      // Add date filter
      if (dateFilter !== "all") {
        const now = new Date();
        let startDate;

        switch (dateFilter) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            break;
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
        }
        filters.push(where("date", ">=", startDate));
      }

      // Construct the base query with all filters
      const baseQuery = query(
        ordersRef,
        ...filters,
        orderBy("date", "desc")
      );

      let paginatedQuery;
      if (direction === "next" && lastDoc) {
        paginatedQuery = query(baseQuery, startAfter(lastDoc), limit(PAGE_SIZE));
      } else if (direction === "prev" && firstDoc) {
        const prevQueryBase = query(
          ordersRef,
          ...filters,
          orderBy("date", "asc")
        );
        paginatedQuery = query(prevQueryBase, endBefore(firstDoc), limit(PAGE_SIZE));
      } else {
        paginatedQuery = query(baseQuery, limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(paginatedQuery);

      if (!snapshot.empty) {
        let orderList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (direction === "prev") {
          orderList.reverse();
        }

        if (debouncedSearchTerm) {
          orderList = orderList.filter(
            (order) =>
              order.customerId?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
              order.product?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
              order.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
          );
        }

        setOrders(orderList);
        setFirstDoc(snapshot.docs[0]);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);

        const nextQuery = query(baseQuery, startAfter(snapshot.docs[snapshot.docs.length - 1]), limit(1));
        const nextSnapshot = await getDocs(nextQuery);
        setHasNext(!nextSnapshot.empty);

        const prevQuery = query(baseQuery, endBefore(snapshot.docs[0]), limit(1));
        const prevSnapshot = await getDocs(prevQuery);
        setHasPrev(!prevSnapshot.empty);

      } else {
        setOrders([]);
        setFirstDoc(null);
        setLastDoc(null);
        setHasNext(false);
        setHasPrev(false);
      }
    } catch (err) {
      console.error("Error fetching orders: ", err);
      setError("Failed to load orders.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchAllStats();
    fetchOrders("initial");
  }, [statusFilter, dateFilter, debouncedSearchTerm]);

  const updateOrderStatus = async (id, newStatus) => {
    try {
      const orderRef = doc(db, "orders", id);
      await updateDoc(orderRef, {
        status: newStatus,
        lastUpdated: new Date(),
      });

      showAlert("success", `Order status updated to "${newStatus}"!`);

      fetchAllStats();
      fetchOrders("initial");
      setExpandedCard(null);
    } catch (err) {
      console.error("Error updating order status:", err);
      showAlert("error", "Failed to update status.");
    }
  };

  const handleDelete = (id) => {
  showAlert(
    'confirm',
    'Are you sure you want to delete this order?',
    () => deleteOrder(id), // onConfirm callback
    'Delete', // confirmText
    () => console.log('Delete action canceled.') // onCancel callback
  );
};

  const deleteOrder = async (id) => {
    try {
      const orderRef = doc(db, "orders", id);
      await deleteDoc(orderRef);

      showAlert("success", "Order deleted successfully!");

      fetchAllStats();
      fetchOrders("initial");
      setExpandedCard(null);
    } catch (err) {
      console.error("Error deleting order:", err);
      showAlert("error", "Failed to delete order.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse max-w-7xl mx-auto">
          <div className="h-10 bg-gray-200 rounded-lg w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-xl text-red-600 font-semibold mb-2">Error Loading Orders</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F1]">
      {/* Header Section */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
              <p className="text-gray-600">Manage and track all customer orders</p>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 lg:mt-0 grid grid-cols-3 lg:grid-cols-6 gap-4 text-center">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-3">
                <div className="text-2xl font-bold">{orderStats.total}</div>
                <div className="text-sm opacity-90">Total</div>
              </div>
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg p-3">
                <div className="text-2xl font-bold">{orderStats.pending}</div>
                <div className="text-sm opacity-90">Pending</div>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-3">
                <div className="text-2xl font-bold">{orderStats.confirmed}</div>
                <div className="text-sm opacity-90">Confirmed</div>
              </div>
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-3">
                <div className="text-2xl font-bold">{orderStats.declined}</div>
                <div className="text-sm opacity-90">Declined</div>
              </div>
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg p-3">
                <div className="text-2xl font-bold">{orderStats.grab}</div>
                <div className="text-sm opacity-90">Pickup</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-3">
                <div className="text-2xl font-bold">{orderStats.sold}</div>
                <div className="text-sm opacity-90">Completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders, customers, products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">🔍</div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
              <option value="grab">Ready for Pickup</option>
              <option value="sold">Completed</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setStatusFilter("all");
                setDateFilter("all");
                setSearchTerm("");
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {orders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const availableActions = statusTransitions[order.status] || [];
                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-300 hover:shadow-lg cursor-pointer ${
                      expandedCard === order.id
                        ? "border-blue-400 shadow-lg transform scale-105"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                    onClick={() =>
                      setExpandedCard(
                        expandedCard === order.id ? null : order.id
                      )
                    }
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">Order ID</div>
                          <div className="font-semibold text-gray-900 truncate">#{order.id.slice(-8)}</div>
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                          <span className="mr-1">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Customer:</span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {order.customerId || "N/A"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Product:</span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {order.product || "N/A"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Amount:</span>
                          <span className="text-lg font-bold text-green-600">
                            ₱{order.price?.toLocaleString() || "0"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Date:</span>
                          <span className="text-sm text-gray-700">
                            {getRelativeTime(order.date)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons - Show when expanded */}
                      {expandedCard === order.id && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <div className="flex flex-col space-y-2">
                            {/* Dynamically render action buttons */}
                            {availableActions.map((action) => (
                              <button
                                key={action.newStatus}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOrderStatus(order.id, action.newStatus);
                                }}
                                className={`w-full px-4 py-2 text-white font-medium rounded-lg transition-colors flex items-center justify-center ${action.color} hover:opacity-90`}
                              >
                                {action.label}
                              </button>
                            ))}

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(order.id);
                              }}
                              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors flex items-center justify-center"
                            >
                              🗑️ Delete Order
                            </button>

                            {/* Additional Actions */}
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDetailsClick(order);
                                }}
                                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-m font-medium rounded-lg transition-colors"
                              >
                                👁️ Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmailClick(order.customerEmail);
                                }}
                                className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-m font-medium rounded-lg transition-colors"
                              >
                                Email
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <div className="px-6 pb-4">
                      <div className="text-center text-xs text-gray-400">
                        {expandedCard === order.id ? "▲ Click to collapse" : "▼ Click to expand"}
                      </div>
                    </div>
                  </div>
                );
              })}

              {orders.length < PAGE_SIZE &&
                Array.from({ length: PAGE_SIZE - orders.length }).map((_, idx) => (
                  <div key={`placeholder-${idx}`} className="hidden lg:block" />
                ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-between items-center bg-white rounded-xl shadow-sm border p-6">
              <button
                disabled={!hasPrev}
                onClick={() => {
                  fetchOrders("prev");
                  setPage(prevPage => prevPage - 1);
                }}
                className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                  hasPrev
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                ← Previous
              </button>

              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Page {page}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{orders.length} orders</span>
              </div>

              <button
                disabled={!hasNext}
                onClick={() => {
                  fetchOrders("next");
                  setPage(prevPage => prevPage + 1);
                }}
                className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                  hasNext
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Next →
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {statusFilter !== "all" || dateFilter !== "all" || searchTerm
                ? "No orders match your current filters. Try adjusting your search criteria."
                : "No orders have been placed yet. Orders will appear here once customers start making purchases."}
            </p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrdersModal order={selectedOrder} onClose={handleCloseModal} />
      )}

      {isEmailModalOpen && (
        <EmailModal
          recipient={emailRecipient}
          onClose={handleCloseEmailModal}
        />
      )}
    </div>
  );
};

export default OrderManagement;