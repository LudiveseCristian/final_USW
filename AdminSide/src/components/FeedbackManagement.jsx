import React, { useState, useEffect } from 'react';
import {
  Star,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Clock,
  MessageSquare,
  User,
  Calendar,
  Package,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Trash2,
  MoreHorizontal,
  BarChart2,
} from 'lucide-react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAlert } from '../contexts/alertContext';

// NOTE: Assumed presence of custom UI components (LoadingSpinner, StatusBadge) where used.

const FeedbackManagement = () => {
  const [feedback, setFeedback] = useState([]);
  const [filteredFeedback, setFilteredFeedback] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filterRating, setFilterRating] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const { showAlert } = useAlert();

  // New state for image modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalData, setImageModalData] = useState({
    images: [],
    currentIndex: 0,
    title: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    averageRating: 0,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'feedbacks'), (snapshot) => {
      const feedbackData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setFeedback(feedbackData);

      const total = feedbackData.length;
      const pending = feedbackData.filter((f) => f.status === 'pending').length;
      const approved = feedbackData.filter((f) => f.status === 'approved').length;
      const rejected = feedbackData.filter((f) => f.status === 'rejected').length;
      const averageRating = total > 0
        ? (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / total).toFixed(1)
        : 0;

      setStats({ total, pending, approved, rejected, averageRating });
      setLoading(false);
    }, (error) => {
      console.error('Error fetching feedback:', error);
      setLoading(false);
      showAlert('error', 'Failed to load feedback. Please try again later.');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = [...feedback];

    if (activeTab !== 'all') {
      filtered = filtered.filter((item) => item.status === activeTab);
    }

    if (searchTerm) {
      filtered = filtered.filter((item) =>
        (item.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reviewText || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRating !== 'all') {
      filtered = filtered.filter((item) => item.rating === parseInt(filterRating));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
        case 'oldest':
          return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
        case 'highest':
          return (b.rating || 0) - (a.rating || 0);
        case 'lowest':
          return (a.rating || 0) - (b.rating || 0);
        default:
          return 0;
      }
    });

    setFilteredFeedback(filtered);
    setCurrentPage(1);
  }, [feedback, activeTab, searchTerm, sortBy, filterRating]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'feedbacks', id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setShowModal(false);
      setSelectedFeedback(null);
      showAlert('success', `Feedback approved for display successfully!`);
    } catch (error) {
      console.error('Error updating feedback:', error);
      showAlert('error', 'Failed to update feedback status. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'feedbacks', id));
        setShowModal(false);
        setSelectedFeedback(null);
        showAlert('success', 'Feedback deleted successfully!');
      } catch (error) {
        console.error('Error deleting feedback:', error);
        showAlert('error', 'Failed to delete feedback. Please try again.');
      }
    }
  };

  const openImageModal = (images, currentIndex, title) => {
    setImageModalData({ images, currentIndex, title });
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setImageModalData({ images: [], currentIndex: 0, title: '' });
  };

  const nextImage = () => {
    setImageModalData((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }));
  };

  const prevImage = () => {
    setImageModalData((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const renderStars = (rating, size = 'w-4 h-4') => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= (rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'all', label: 'All Feedback', count: stats.total },
    { id: 'pending', label: 'Pending Review', count: stats.pending },
    { id: 'approved', label: 'Approved', count: stats.approved },
    { id: 'rejected', label: 'Rejected', count: stats.rejected },
  ];

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFeedback = filteredFeedback.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      
      {/* 1. HEADER SECTION - Now contains the cards directly, padding adjusted for cleaner break */}
      <div className="bg-[#135918] rounded-bl-xl rounded-br-xl shadow-md pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Text */}
          <div className="py-6">
            <h1 className="text-3xl font-bold text-white">Feedback Management</h1>
            <p className="mt-2 text-green-200">
              Review and manage user feedback
            </p>
          </div>

          {/* 2. STATISTICS CARDS - Moved inside the header and using bg-green-50 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-8">
            
            {/* Card 1: Total Feedback */}
            <div className="bg-[#2e7334] rounded-xl shadow-xl p-6 border border-green-500 transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Total Feedback</p>
                  <p className="text-2xl font-bold text-green-300">{stats.total}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Card 2: Pending Review */}
            <div className="bg-[#2e7334] rounded-xl shadow-xl p-6 border border-yellow-100 transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Pending Review</p>
                  <p className="text-2xl font-bold text-green-300">{stats.pending}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Card 3: Approved */}
            <div className="bg-[#2e7334] rounded-xl shadow-xl p-6 border border-green-100 transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Approved</p>
                  <p className="text-2xl font-bold text-green-300">{stats.approved}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Check className="w-6 h-6 text-[#0d7214]" />
                </div>
              </div>
            </div>

            {/* Card 4: Average Rating */}
            <div className="bg-[#2e7334] rounded-xl shadow-xl p-6 border border-blue-400 transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Average Rating</p>
                  <div className="flex items-center mt-1">
                    <p className="text-2xl font-bold text-green-300 mr-2">{stats.averageRating}</p>
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Controls - Starts directly after the header with standard spacing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-800 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by user, product, or review text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-800 rounded-lg focus:border-[#135918] focus:ring-2 focus:ring-green-800"
                />
              </div>
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-800 rounded-lg focus:border-[#135918] focus:ring-2 focus:ring-green-200 transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>

            <div>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-800 rounded-lg focus:border-[#135918] focus:ring-2 focus:ring-green-200 transition-colors"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#135918] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.id !== 'all' && getStatusIcon(tab.id)}
                <span className={tab.id !== 'all' ? 'ml-2' : ''}>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      activeTab === tab.id
                        ? 'bg-white text-[#135918]'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Feedback Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredFeedback.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No feedback found</h3>
            <p className="text-gray-500">
              {searchTerm
                ? 'No feedback matches your search criteria.'
                : `No ${activeTab === 'all' ? '' : activeTab} feedback available.`}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentFeedback.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-green-100 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedFeedback(item);
                    setShowModal(true);
                  }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        {item.productImage && (
                          <div className="relative">
                            <img
                              src={item.productImage}
                              alt={item.productTitle || 'Product'}
                              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageModal([item.productImage], 0, 'Product Image');
                              }}
                            />
                            <div className="absolute -bottom-1 -right-1 bg-blue-100 text-blue-700 text-xs px-1 rounded">
                              Product
                            </div>
                          </div>
                        )}
                        {item.reviewImages && item.reviewImages.length > 0 && (
                          <div className="flex space-x-2 flex-1">
                            {item.reviewImages.slice(0, 3).map((image, idx) => (
                              <div key={idx} className="relative">
                                <img
                                  src={image}
                                  alt={`Review ${idx + 1}`}
                                  className="w-12 h-12 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openImageModal(item.reviewImages, idx, 'Review Images');
                                  }}
                                />
                                {item.reviewImages.length > 3 && idx === 2 && (
                                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      +{item.reviewImages.length - 3}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span className="ml-1 capitalize">{item.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.userName || 'Anonymous'}</h3>
                        <p className="text-sm text-gray-500 truncate max-w-48">{item.productTitle || 'Untitled Product'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      {renderStars(item.rating)}
                      <span className="text-sm font-medium text-gray-600">{item.rating || 0}/5</span>
                    </div>
                    <p className="text-gray-700 text-sm line-clamp-3 mb-4">
                      {item.reviewText || 'No review text provided.'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(item.submittedAt)}
                      </div>
                      <div className="flex items-center">
                        <Package className="w-3 h-3 mr-1" />
                        {item.category || 'Uncategorized'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-2 text-sm rounded-md ${
                        currentPage === i + 1
                          ? 'bg-[#135918] text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. Feedback Detail Modal */}
      {showModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-green-800">Feedback Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start space-x-4">
                {selectedFeedback.productImage && (
                  <div className="relative">
                    <img
                      src={selectedFeedback.productImage}
                      alt={selectedFeedback.productTitle || 'Product'}
                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openImageModal([selectedFeedback.productImage], 0, 'Product Image')}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                      Product
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {selectedFeedback.productTitle || 'Untitled Product'}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {selectedFeedback.userName || 'Anonymous'}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(selectedFeedback.submittedAt)}
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedFeedback.status)}`}
                  >
                    {getStatusIcon(selectedFeedback.status)}
                    <span className="ml-2 capitalize">{selectedFeedback.status}</span>
                  </div>
                </div>
              </div>
              {selectedFeedback.reviewImages && selectedFeedback.reviewImages.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Review Photos by Customer</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedFeedback.reviewImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openImageModal(selectedFeedback.reviewImages, index, 'Review Images')}
                        />
                        <div className="absolute top-1 right-1 bg-green-100 text-green-700 text-xs px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Rating</span>
                  <span className="text-lg font-bold text-gray-900">{selectedFeedback.rating || 0}/5</span>
                </div>
                {renderStars(selectedFeedback.rating, 'w-6 h-6')}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Review</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 leading-relaxed">
                    {selectedFeedback.reviewText || 'No review text provided.'}
                  </p>
                </div>
              </div>
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDelete(selectedFeedback.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
                <div className="flex space-x-3">
                  {selectedFeedback.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(selectedFeedback.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedFeedback.id, 'approved')}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve for Display
                      </button>
                    </>
                  )}
                  {selectedFeedback.status === 'approved' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedFeedback.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </button>
                  )}
                  {selectedFeedback.status === 'rejected' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedFeedback.id, 'approved')}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve for Display
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-green-800">{imageModalData.title}</h2>
              <button
                onClick={closeImageModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative flex items-center justify-center p-6">
              {imageModalData.images.length > 1 && (
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <img
                src={imageModalData.images[imageModalData.currentIndex]}
                alt={imageModalData.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
              {imageModalData.images.length > 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
            {imageModalData.images.length > 1 && (
              <div className="flex justify-center space-x-2 p-4">
                {imageModalData.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setImageModalData((prev) => ({ ...prev, currentIndex: index }))}
                    className={`w-3 h-3 rounded-full ${
                      index === imageModalData.currentIndex ? 'bg-[#135918]' : 'bg-gray-300'
                    }`}
                  ></button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;