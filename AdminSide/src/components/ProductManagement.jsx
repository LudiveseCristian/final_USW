import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Package,
  Eye,
  DollarSign,
  Tag,
  Shirt,
  Star,
  Clock,
  Users,
  Gavel,
  Timer,
  TrendingUp,
} from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  query,      
  where      
} from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ProductsModal from '../modals/ProductsModal';
import BidManagementModal from '../modals/BidManagementModal';
import CategoryModal from '../modals/CategoryModal';
import { useAlert } from "../contexts/alertContext";
import { Card, CardContent, Button, Pagination, LoadingSpinner, EmptyState, StatusBadge } from './ui';

const ProductManagement = () => {
  // State variables for UI and data management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedBidProduct, setSelectedBidProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('products');
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { showAlert } = useAlert();

  const productsPerPage = 4;

  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    size: '',
    length: '',
    width: '',
    condition: '',
    status: 'available',
    imageUrls: [],
    biddingEnabled: false,
    minimumBid: '',
    currentBid: '',
    bidEndTime: '',
    bids: [],
    highestBidder: null,
    orderId: '',
  });

  useEffect(() => {
    // Implement real-time listener for products collection
    const productsCollection = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        bidEndTime: doc.data().bidEndTime?.toDate?.() || doc.data().bidEndTime,
      }));
      setProducts(fetchedProducts);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to products collection:', error);
      setLoading(false);
      showAlert('error', 'Error fetching products. Please try again.');
    });

    const interval = setInterval(checkExpiredAuctions, 60000); // Check every minute
    return () => {
      unsubscribe();
      clearInterval(interval);
    }
  }, []);

  const updateProductStatusForEndingSoon = async (product) => {
    try {
      const now = new Date();
      const endTime = new Date(product.bidEndTime);
      const oneHour = 60 * 60 * 1000;
      if (
        product.biddingEnabled &&
        product.status !== 'ending soon' &&
        endTime - now <= oneHour &&
        endTime - now > 0
      ) {
        await updateDoc(doc(db, 'products', product.id), {
          status: 'ending soon',
          updatedAt: new Date(),
        });
        setProducts((prevProducts) =>
          prevProducts.map((p) =>
            p.id === product.id ? { ...p, status: 'ending soon' } : p
          )
        );
      }
    } catch (error) {
      console.error('Error updating product status to "ending soon":', error);
    }
  };

  // --- Firebase Data Fetching and Management ---
  // Removed fetchProducts as onSnapshot handles this now.

  const checkExpiredAuctions = () => {
    const now = new Date();
    setProducts((prevProducts) =>
      prevProducts.map((product) => {
        // Check for expired auctions first
        if (
          product.biddingEnabled &&
          product.bidEndTime &&
          new Date(product.bidEndTime) <= now &&
          product.status !== 'sold' &&
          product.status !== 'expired'
        ) {
          updateProductStatus(product.id, 'expired');
          return {
            ...product,
            status: 'expired',
            biddingEnabled: false,
          };
        }
        // New logic to check for "ending soon" status
        if (
          product.biddingEnabled &&
          product.bidEndTime &&
          product.status === 'available'
        ) {
          const timeLeft = new Date(product.bidEndTime) - now;
          const oneHourInMillis = 60 * 60 * 1000;
          
          // Change status to 'ending soon' if less than 1 hour remains
          if (timeLeft > 0 && timeLeft < oneHourInMillis) {
            updateProductStatus(product.id, 'ending soon');
            return {
              ...product,
              status: 'ending soon',
            };
          }
        }
        return product;
      })
    );
  };

  const updateProductStatus = async (productId, newStatus) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'expired' && { biddingEnabled: false }),
      });
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  const uploadImageToFirebase = async (file) => {
    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${randomString}_${cleanFileName}`;

      const storageRef = ref(storage, `products/${fileName}`);
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
        },
      };
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 'storage/unauthorized') {
        throw new Error(
          'Upload failed: Please check Firebase Storage security rules and ensure you are logged in'
        );
      } else if (error.code === 'storage/retry-limit-exceeded') {
        throw new Error('Upload failed: Network error. Please try again.');
      } else {
        throw new Error(`Failed to upload image: ${error.message}`);
      }
    }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        showAlert('error', 'Product name is required');
        return;
      }

      if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
        showAlert('error', 'Please enter a valid price');
        return;
      }

      if (formData.status === 'available') {
          formData.minimumBid = formData.price;
      }

      if (formData.biddingEnabled) {
        if (
          !formData.minimumBid ||
          isNaN(formData.minimumBid) ||
          parseFloat(formData.minimumBid) <= 0
        ) {
          showAlert('error', 'Please enter a valid minimum bid amount');
          return;
        }

        if (!formData.bidEndTime) {
          showAlert('error', 'Please select an end time for bidding');
          return;
        }

        const endTime = new Date(formData.bidEndTime);
        if (endTime <= new Date()) {
          showAlert('error', 'Bid end time must be in the future');
          return;
        }
      }

      try {
        setUploading(true);
        setUploadProgress(0);
        let imageUrls = [...(formData.imageUrls || [])];

        if (imageFiles.length > 0) {
          for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            if (!file.type.startsWith('image/')) {
              throw new Error(`File ${file.name} is not an image`);
            }

            if (file.size > 5 * 1024 * 1024) {
              throw new Error(`File ${file.name} is too large. Maximum size is 5MB`);
            }

            const downloadURL = await uploadImageToFirebase(file);
            imageUrls.push(downloadURL);
            setUploadProgress(((i + 1) / imageFiles.length) * 100);
          }
        }

        let nextNumericId = editingProduct?.numericId || null;
        if (!editingProduct) {
          try {
            const allSnap = await getDocs(collection(db, 'products'));
            const existingIds = allSnap.docs
              .map((d) => d.data()?.numericId)
              .filter((n) => typeof n === 'number');
            const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
            nextNumericId = maxId + 1;
          } catch (e) {
            console.warn('Could not compute next numericId, defaulting to 1');
            nextNumericId = 1;
          }
        }

        const productPayload = {
          ...formData,
          price: parseFloat(formData.price),
          minimumBid: formData.biddingEnabled ?
            parseFloat(formData.minimumBid) : null,
          currentBid: formData.biddingEnabled ?
            parseFloat(formData.minimumBid) : null,
          bidEndTime: formData.biddingEnabled ?
            new Date(formData.bidEndTime) : null,
          imageUrls,
          bids: formData.bids || [],
          numericId: nextNumericId,
          orderId: formData.orderId?.trim() || null,
          createdAt: editingProduct ?
            formData.createdAt : new Date(),
          updatedAt: new Date(),
        };
        if (editingProduct) {
          await updateDoc(doc(db, 'products', editingProduct.id), productPayload);
          setProducts(
            products.map((p) => (p.id === editingProduct.id ? { ...p, ...productPayload } : p))
          );
          showAlert('success', 'Product updated successfully!');
        } else {
          const docRef = await addDoc(collection(db, 'products'), productPayload);
          setProducts([...products, { id: docRef.id, ...productPayload }]);
          showAlert('success', 'Product added successfully!');
        }

        resetForm();
        setShowModal(false);
      } catch (error) {
        console.error('Error saving product:', error);
        showAlert('error', `Failed to save product: ${error.message}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    };

    const handleAcceptBid = async (productId, acceptedBid) => {
  try {
    const product = products.find((p) => p.id === productId);

    let userProfile = null;
    try {
      if (acceptedBid.bidderId) {
        const userRef = doc(db, 'users', acceptedBid.bidderId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userProfile = userSnap.data();
        }
      }
    } catch (e) {
      console.warn('Could not fetch user profile for order creation:', e);
    }

    // Update product status
    await updateDoc(doc(db, 'products', productId), {
      status: 'sold',
      biddingEnabled: false,
      highestBidder: acceptedBid.bidderName,
      finalPrice: acceptedBid.amount,
      soldAt: new Date(),
      updatedAt: new Date(),
      winnerBidderId: acceptedBid.bidderId, // ADD THIS LINE - Important for MessagesScreen detection
    });

    // **NEW CODE: Send win notification to user's conversation**
    if (acceptedBid.bidderId) {
      try {
        // Find user's conversation
        const conversationsRef = collection(db, 'conversations');
        const q = query(
          conversationsRef,
          where('participants', 'array-contains', acceptedBid.bidderId)
        );
        const conversationSnapshot = await getDocs(q);

        if (!conversationSnapshot.empty) {
          const conversationId = conversationSnapshot.docs[0].id;
          const messagesRef = collection(db, 'conversations', conversationId, 'messages');

          // Send win notification message
          await addDoc(messagesRef, {
            senderId: 'admin',
            senderType: 'admin',
            text: `🎉 Congratulations! You've won "${product.name}" with a bid of ₱${acceptedBid.amount.toLocaleString()}! Your item is ready for checkout.`,
            type: 'win_notification',
            productId: productId,
            imageUrl: product.imageUrls?.[0] || null,
            timestamp: new Date(),
            status: 'delivered'
          });

          // Update conversation metadata
          const conversationRef = doc(db, 'conversations', conversationId);
          const conversationDoc = await getDoc(conversationRef);
          const currentUnreadCount = conversationDoc.data()?.unreadCount?.[acceptedBid.bidderId] || 0;

          await updateDoc(conversationRef, {
            lastMessage: `🎉 You won: ${product.name}`,
            lastMessageTime: new Date(),
            [`unreadCount.${acceptedBid.bidderId}`]: currentUnreadCount + 1
          });

          console.log('Win notification sent successfully');
        }
      } catch (notificationError) {
        console.error('Error sending win notification:', notificationError);
        // Don't throw error - continue with the rest of the process
      }
    }
    // **END NEW CODE**

    setProducts(
      products.map((p) =>
        p.id === productId
          ? {
              ...p,
              status: 'sold',
              biddingEnabled: false,
              highestBidder: acceptedBid.bidderName,
              finalPrice: acceptedBid.amount,
              winnerBidderId: acceptedBid.bidderId, // ADD THIS LINE
            }
          : p
      )
    );

    // Create order document
    try {
      const ordersRef = collection(db, 'orders');
      await addDoc(ordersRef, {
        customerId: acceptedBid.bidderId || null,
        customerName: userProfile?.name || acceptedBid.bidderName || null,
        customerEmail: acceptedBid.bidderEmail || null,
        contactNumber: userProfile?.contactNumber || null,
        address: userProfile?.address || null,
        productId: productId,
        product: product.name,
        productImage: product.imageUrls?.[0] || null,
        category: product.category || null,
        price: acceptedBid.amount,
        status: 'pending',
        date: new Date(),
      });
    } catch (orderErr) {
      console.error('Failed to create order document:', orderErr);
    }

    showAlert('success',
      `Bid accepted! Product sold to ${acceptedBid.bidderName} for ₱${acceptedBid.amount.toLocaleString()}`
    );
    setShowBidModal(false);
  } catch (error) {
    console.error('Error accepting bid:', error);
    showAlert('error', 'Failed to accept bid. Please try again.');
  }
};

  const handleRejectBid = async (productId, bid) => {
    try {
      const product = products.find((p) => p.id === productId);
      // Find the bid to remove by checking its properties
      const updatedBids = product.bids.filter((b) => b.bidderId !== bid.bidderId || b.amount !== bid.amount || b.timestamp !== bid.timestamp);

      await updateDoc(doc(db, 'products', productId), {
        bids: updatedBids,
        updatedAt: new Date(),
      });
      setProducts(products.map((p) => (p.id === productId ? { ...p, bids: updatedBids } : p)));
      showAlert('success', 'Bid rejected successfully');
    } catch (error) {
      console.error('Error rejecting bid:', error);
      showAlert('error', 'Failed to reject bid. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      price: product.price?.toString() || '',
      minimumBid: product.minimumBid?.toString() || '',
      bidEndTime: product.bidEndTime
        ? new Date(product.bidEndTime).toISOString().slice(0, 16)
        : '',
      orderId: product.orderId || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        setProducts(products.filter((p) => p.id !== productId));
        showAlert('success', 'Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('error', 'Failed to delete product. Please try again.');
      }
    }
  };

  const handleViewBids = (product) => {
    setSelectedBidProduct(product);
    setShowBidModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      size: '',
      length: '',
      width: '',
      condition: '',
      status: 'available',
      imageUrls: [],
      biddingEnabled: false,
      minimumBid: '',
      currentBid: '',
      bidEndTime: '',
      bids: [],
      highestBidder: null,
      orderId: '',
    });
    setEditingProduct(null);
    setImageFiles([]);
    setUploadProgress(0);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleImageFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        showAlert('error', `${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        showAlert('error', `${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      return true;
    });
    setImageFiles([...imageFiles, ...validFiles]);
  };

  const removeImageFile = (indexToRemove) => {
    setImageFiles(imageFiles.filter((_, index) => index !== indexToRemove));
  };

  const removeImageUrl = (indexToRemove) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, index) => index !== indexToRemove),
    });
  };

  // --- Utility Functions ---
  const getTimeLeft = (endTime) => {
    if (!endTime) return 'No end time';
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getBiddingProducts = () => {
    return products
      .filter((product) => product.biddingEnabled && product.bids?.length > 0)
      .map((product) => {
        const highestBid = product.bids.reduce((latest, current) => {
          return new Date(latest.timestamp) > new Date(current.timestamp) ? latest : current;
        }, product.bids[0]);

        return {
          ...product,
          latestBid: highestBid,
        };
      });
  };
  
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.finalPrice && product.finalPrice.toString().includes(searchTerm)) ||
      (product.price && product.price.toString().includes(searchTerm));

    const matchesStatus =
      filterStatus === 'all' || product.status === filterStatus;
      
    // New condition to filter out sold and expired products
    const isNotSold = product.status !== 'sold';
    // Combine all filters
    return matchesSearch && matchesStatus && isNotSold;
  });

  const formatPrice = (price) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₱${numPrice?.toLocaleString() || '0'}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'sold':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'reserved':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ending soon':
        return 'bg-orange-500 text-white border-orange-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionIcon = (condition) => {
    switch (condition) {
      case 'Excellent':
        return <Star className="h-4 w-4 text-yellow-500 fill-current" />;
      case 'Good':
        return <Star className="h-4 w-4 text-yellow-400" />;
      case 'Fair':
        return <Star className="h-4 w-4 text-yellow-300" />;
      default:
        return <Star className="h-4 w-4 text-gray-400" />;
    }
  };

  // Pagination logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // --- Rendered JSX ---
  if (loading) {
    return (
      <div className="min-h-screen bg-cream p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-green-800 mb-2">Product Management</h1>
              <p className="text-lg text-gray-600">
                Manage your upcycled streetwear inventory and bidding
              </p>
              <div className="flex items-center space-x-6 mt-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Package className="h-4 w-4 mr-1" />
                  {products.length} Products
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Gavel className="h-4 w-4 mr-1" />
                  {getBiddingProducts().length} Active Auctions
                </div>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="bg-[#135918] hover:bg-[#0F4713] text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
                <span>Add Category</span>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#135918] hover:bg-[#0F4713] text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-5 w-5" />
                <span>Add Product</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Section */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors ${
                activeTab === 'products'
                  ? 'bg-[#135918] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Package className="h-5 w-5" />
              <span>Products</span>
            </button>
            <button
              onClick={() => setActiveTab('bidding')}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-colors ${
                activeTab === 'bidding'
                  ? 'bg-[#135918] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Gavel className="h-5 w-5" />
              <span>Bid Management</span>
              {getBiddingProducts().length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                  {getBiddingProducts().length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content: Products or Bid Management */}
        {activeTab === 'products' ? (
          <>
            {/* Search and Filter Section */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute
                    left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search products by name, description, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#135918] focus:border-[#135918] outline-none transition-colors"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#135918] focus:border-[#135918] outline-none bg-white min-w-[160px]"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="expired">Expired</option>

                </select>
              </div>
            </div>

            {/* Products Grid Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <div className="relative">
                    {product.imageUrls
                    && product.imageUrls.length > 0 ? (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={product.imageUrls[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = '/placeholder-image.png';
                          }}
                        />
                        {product.imageUrls.length > 1 && (
                          <div
                            className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center">
                            <Eye className="h-3 w-3 mr-1" />
                            {product.imageUrls.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 bg-gray-100 flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                          product.status
                        )}`}
                      >
                        {product.status}
                      </span>
                      {product.biddingEnabled && (
                        <span className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1 rounded-full text-xs font-semibold border flex items-center">
                          <Gavel className="h-3 w-3 mr-1" />
                          Auction
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between
                      mb-3">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1 mr-2">
                        {product.name}
                      </h3>
                      <span className="text-xl font-bold text-[#135918]">
                        {product.biddingEnabled && product.minimumBid
                          ? formatPrice(product.minimumBid)
                          : formatPrice(product.price)}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                      {product.description}
                    </p>

                    {product.biddingEnabled && (
                      <div className="mb-4 p-3 bg-orange-50 rounded-lg">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Highest Bid:</span>
                          <span className="font-semibold">{formatPrice(product.currentBid)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Bids:</span>
                          <span className="font-semibold">{product.bids?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Time Left:
                          </span>
                          <span className="font-semibold text-orange-600">
                            {getTimeLeft(product.bidEndTime)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                          <Tag className="h-4 w-4 mr-1" />
                          {product.category}
                        </div>
                        <div className="flex items-center text-gray-500">
                          <Shirt className="h-4 w-4
                            mr-1" />
                          {product.size}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center text-gray-500">
                          {getConditionIcon(product.condition)}
                          <span className="ml-1">{product.condition}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-colors"
                      >
                        <Edit className="h-4 w-4"
                        />
                        <span>Edit</span>
                      </button>
                      {product.biddingEnabled && product.bids?.length > 0 && (
                        <button
                          onClick={() => handleViewBids(product)}
                          className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-600 px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Users className="h-4 w-4" />
                          <span>Bids</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={paginate}
                  itemsPerPage={productsPerPage}
                  totalItems={filteredProducts.length}
                />
              </div>
            )}

          </>
        ) : (
          /* Bidding Management Section */
          <div className="space-y-6">
            {/* Bidding Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Gavel className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold
                  text-gray-900">
                  {getBiddingProducts().length}
                </div>
                <div className="text-sm text-gray-600">Active Auctions</div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {getBiddingProducts().reduce((sum, product) => sum + (product.bids?.length ||
                    0), 0)}
                </div>
                <div className="text-sm text-gray-600">Total Bids</div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Timer className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {
                    products.filter(
                      (p) =>
                        p.biddingEnabled &&
                        p.bidEndTime &&
                        new Date(p.bidEndTime) > new Date() &&
                        new Date(p.bidEndTime) - new Date() < 24 * 60 * 60 * 1000
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Ending
                  Soon</div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(
                    getBiddingProducts().reduce((sum, product) => sum + (product.currentBid ||
                      0), 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>

            {/* Active Auctions with Bids */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Active Auctions</h2>
              {getBiddingProducts().length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <Gavel className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Auctions</h3>
                  <p className="text-gray-500 mb-6">No products currently have active bids</p>
                </div>
              ) : (
                getBiddingProducts().map((product) => (
                  <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Left Column (75% width): Product Image, Name, and Description */}
                        <div className="flex flex-col md:flex-row items-center md:items-start space-x-4 col-span-2">
                          {product.imageUrls?.[0] && (
                            <img
                              src={product.imageUrls[0]}
                              alt={product.name}
                              className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {product.name}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                            <div className="flex items-center justify-center md:justify-start space-x-4 text-sm">
                              <span className="flex items-center text-gray-500">
                                <Clock className="h-4 w-4 mr-1" />
                                {getTimeLeft(product.bidEndTime)}
                              </span>
                              <span className="flex items-center text-gray-500">
                                <Users className="h-4 w-4 mr-1" />
                                {product.bids?.length || 0} bids
                              </span>
                            </div>
                            <div className="mt-4 text-center md:text-left">
                              <div className="text-sm text-gray-500 mb-1">Current Highest Bid</div>
                              <div className="text-2xl font-bold text-green-600">
                                {formatPrice(product.currentBid)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column (25% width): Highest Bidder & Manage Bids */}
                        <div className="flex flex-col justify-between col-span-1 mt-4 md:mt-0">
                          <div>
                            {product.bids && product.bids.length > 0 && (
                              <>
                                <h4 className="font-semibold text-gray-900 mb-3 text-center md:text-left">Highest Bidder</h4>
                                {(() => {
                                  // Find the highest bid based on amount
                                  const highestBid = product.bids.reduce((highest, current) => {
                                    return current.amount > highest.amount ? current : highest;
                                  }, product.bids[0]);

                                  return (
                                    <div
                                      key={highestBid.timestamp}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-blue-600 font-semibold text-sm">
                                            {highestBid.bidderName?.charAt(0)?.toUpperCase()}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="font-medium text-gray-900">
                                            {highestBid.bidderName}
                                          </div>
                                          <div className="text-sm text-gray-500">
                                            {new Date(highestBid.timestamp).toLocaleDateString()} at{' '}
                                            {new Date(highestBid.timestamp).toLocaleTimeString()}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-lg font-bold text-gray-900">
                                        {formatPrice(highestBid.amount)}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                          <div className="mt-4">
                            <button
                              onClick={() => handleViewBids(product)}
                              className="w-full bg-[#135918] hover:bg-[#0F4713] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              Manage Bids
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && activeTab === 'products' && (
          <Card>
            <CardContent className="p-12">
              <EmptyState
                icon={Package}
                title="No products found"
                description={
                  searchTerm || filterStatus !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first product'
                }
                action={
                  !searchTerm && filterStatus === 'all' ? (
                    <Button
                      onClick={() => setShowModal(true)}
                      size="lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Your First Product
                    </Button>
                  ) : null
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Modals Section */}
        {showModal && (
          <ProductsModal
            showModal={showModal}
            setShowModal={setShowModal}
            editingProduct={editingProduct}
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            uploading={uploading}
            uploadProgress={uploadProgress}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleImageFileChange={handleImageFileChange}
            imageFiles={imageFiles}
            removeImageFile={removeImageFile}
            removeImageUrl={removeImageUrl}
            resetForm={resetForm}
          />
        )}
        {showCategoryModal && (
          <CategoryModal
            showModal={showCategoryModal}
            setShowModal={setShowCategoryModal}
          />
        )}
        <BidManagementModal
          showBidModal={showBidModal}
          selectedBidProduct={selectedBidProduct}
          setShowBidModal={setShowBidModal}
          setSelectedBidProduct={setSelectedBidProduct}
          formatPrice={formatPrice}
          getTimeLeft={getTimeLeft}
          handleAcceptBid={handleAcceptBid}
          handleRejectBid={handleRejectBid}
        />
      </div>
    </div>
  );
};

export default ProductManagement;