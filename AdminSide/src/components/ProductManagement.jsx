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
  ListOrdered
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
// Assuming these are custom UI components
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

  // --- Theme Helpers ---
  const formatPrice = (amount) => {
    if (typeof amount !== 'number') return '₱0.00';
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const getTimeLeft = (endTime) => {
    if (!endTime) return 'N/A';
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m`;

    return timeString.trim() || '< 1m';
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'available':
        return { label: 'Available', color: 'bg-green-100 text-green-800 border-green-200', icon: Tag };
      case 'ending soon':
        return { label: 'Ending Soon', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Timer };
      case 'expired':
        return { label: 'Expired', color: 'bg-red-100 text-red-800 border-red-200', icon: Clock };
      case 'sold':
        return { label: 'Sold', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: DollarSign };
      default:
        return { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Shirt };
    }
  };
  // --- End Theme Helpers ---

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


    showAlert(
      'success',
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
      const updatedBids = product.bids.filter(
        (b) => b.bidderId !== bid.bidderId || b.amount !== bid.amount || b.timestamp !== bid.timestamp
      );

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
        ? new Date(product.bidEndTime).toISOString().substring(0, 16)
        : '',
      imageUrls: product.imageUrls || [],
    });
    setImageFiles([]); // Clear new files when editing existing product
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        setProducts(products.filter((product) => product.id !== productId));
        showAlert('success', 'Product deleted successfully!');
      } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('error', 'Failed to delete product. Please try again.');
      }
    }
  };

  const handleManageBids = (product) => {
    setSelectedBidProduct(product);
    setShowBidModal(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
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
    setImageFiles([]);
    setDragActive(false);
  };

  // --- Image Upload Handlers (Kept logic, adjusted styles if applicable in Modal) ---

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleImageFileChange = (e) => {
    if (e.target.files) {
      // Convert FileList to Array and append to existing files
      setImageFiles((prevFiles) => [...prevFiles, ...Array.from(e.target.files)]);
      // Optionally reset the input value to allow selecting the same files again later
      e.target.value = null;
    }
  };

  const removeImageFile = (index) => {
    setImageFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const removeImageUrl = (index) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  // --- Filtering and Pagination ---

  const productStatuses = [
    { id: 'all', label: 'All', icon: ListOrdered, color: 'text-gray-600' },
    { id: 'available', label: 'Available', icon: Tag, color: 'text-green-500' },
    { id: 'ending soon', label: 'Ending Soon', icon: Timer, color: 'text-amber-500' },
    { id: 'expired', label: 'Expired', icon: Clock, color: 'text-red-500' },
  ];
  
  // Define the statuses that should be shown in the default 'all' view
  const allowedStatusesForDefaultView = ['available', 'ending soon', 'expired'];

  const filteredProducts = products.filter((product) => {
    
    // Status check
    let matchesStatus = false;
    
    if (filterStatus === 'all') {
      // For the 'all' view, only include the explicitly allowed statuses (excluding 'sold')
      matchesStatus = allowedStatusesForDefaultView.includes(product.status);
    } else {
      // For any other filter (e.g., 'sold', 'available', etc.), check for an exact match
      matchesStatus = product.status === filterStatus;
    }
    
    // Search check
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesStatus && matchesSearch;
  });
  
  const productStatusWithCounts = productStatuses.map(status => ({
    ...status,
    count: status.id === 'all' ? products.filter(p => allowedStatusesForDefaultView.includes(p.status)).length : products.filter(p => p.status === status.id).length
  }));

  // Fix: Calculate the total product count from the full 'products' array, not the filtered default view
  const totalProductsCount = products.filter(product => product.status !== 'sold').length;

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // --- Render ---

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* 🟢 HEADER STYLE: Darker Green */}
      <div className="bg-[#135918] rounded-b-3xl shadow-xl p-8 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between items-start py-4">
            <div>
              <h1 className="text-4xl font-extrabold text-white flex items-center">
                <Package className="w-8 h-8 mr-3 text-green-300" />
                Product Management
              </h1>
              <p className="mt-2 text-green-300 text-lg">
                Manage all auction products, inventory, and bidding details.
              </p>
            </div>
            {/* Main Total Product Stat */}
            <div className="text-right">
                <p className="text-6xl font-bold text-white leading-none">{totalProductsCount}</p>
                <p className="text-green-300 mt-1">Total Products</p>
            </div>
          </div>
        </div>
      </div>
      {/* END HEADER STYLE */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 -mt-6">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          
          {/* Action Buttons and Category Button */}
          <div className="flex justify-between items-center mb-6">
            <div className="space-x-4">
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-[#135918] text-white hover:bg-[#1f7c22] transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" /> Add Product
              </Button>
              <Button
                onClick={() => setShowCategoryModal(true)}
                className="bg-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                <Shirt className="w-5 h-5 mr-2" /> Manage Categories
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products by name or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page on search
              }}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2">
            {productStatusWithCounts.map((status) => {
              const Icon = status.icon;
              return (
                <button
                  key={status.id}
                  onClick={() => {
                    setFilterStatus(status.id);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === status.id
                      ? 'bg-[#135918] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${filterStatus === status.id ? 'text-green-300' : status.color}`} />
                  <span>{status.label}</span>
                  {status.count >= 0 && ( // Ensure count is always displayed
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      filterStatus === status.id
                        ? 'bg-white text-[#135918] font-bold'
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {status.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredProducts.length === 0 ? (
          <EmptyState
            title="No Products Found"
            message={
              searchTerm
                ? 'No products match your search criteria.'
                : `No ${filterStatus === 'all' ? '' : filterStatus} products available.`
            }
            icon={Package}
          >
            {filterStatus === 'all' && (
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="bg-[#135918] text-white hover:bg-[#1f7c22] mt-4 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" /> Add Your First Product
              </Button>
            )}
          </EmptyState>
        ) : (
          <Card className="rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {currentProducts.map((product) => {
                  const statusInfo = getStatusInfo(product.status);
                  const imageUrl = product.imageUrls?.[0] || 'https://via.placeholder.com/400x300/CCCCCC/FFFFFF?text=No+Image';

                  return (
                    <Card key={product.id} className="shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                      <div className="relative h-48">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          <StatusBadge
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                          >
                            <statusInfo.icon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </StatusBadge>
                        </div>
                        {product.biddingEnabled && product.status !== 'sold' && product.status !== 'expired' && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                            <Timer className='w-3 h-3 mr-1 text-green-300' />
                            {getTimeLeft(product.bidEndTime)} left
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 truncate">{product.name}</h3>
                            <span className="text-xs text-gray-500">#{product.numericId}</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">
                          {formatPrice(product.currentBid || product.price)}
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1 text-gray-400" />
                                {product.bids?.length || 0} Bids
                            </span>
                            <span className="flex items-center">
                                <Tag className="w-4 h-4 mr-1 text-gray-400" />
                                {product.category || 'N/A'}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-gray-100 space-y-2">
                          {/* Action Buttons */}
                          <Button
                            onClick={() => handleManageBids(product)}
                            className="w-full flex items-center justify-center bg-[#135918] text-white hover:bg-[#1f7c22] transition-colors"
                            size="sm"
                            disabled={!product.biddingEnabled}
                          >
                            <Gavel className="w-4 h-4 mr-2" /> Manage Bids ({product.bids?.length || 0})
                          </Button>
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleEdit(product)}
                              className="flex-1 bg-blue-500 text-white hover:bg-blue-600"
                              size="sm"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(product.id)}
                              className="flex-1 bg-red-500 text-white hover:bg-red-600"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={productsPerPage}
                  totalItems={filteredProducts.length}
                />
              </div>
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