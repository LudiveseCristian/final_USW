import { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Eye,
  Star,
  Clock,
  Tag,
  Shirt,
  HeartCrack,
  Trash2,
  X,
} from 'lucide-react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { formatPrice, getStatusColor, getConditionIcon } from '../utils/productUtils.jsx';
import SoldProductDetailModal from '../modals/SoldProductDetailModal';
import { useAlert } from "../contexts/alertContext";

const SoldProducts = () => {
  const [soldExpiredProducts, setSoldExpiredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { showAlert } = useAlert();

  // New state for confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 4;

  useEffect(() => {
    fetchSoldExpiredProducts();
  }, []);

  const fetchSoldExpiredProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), where('status', '==', 'sold'));
      const snapshot = await getDocs(q);
      const fetchedProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        soldAt: doc.data().soldAt?.toDate?.() || doc.data().soldAt,
        bidEndTime: doc.data().bidEndTime?.toDate?.() || doc.data().bidEndTime,
      }));
      setSoldExpiredProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching sold and expired products:', error);
      showAlert('error', 'Failed to fetch products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (productId) => {
    setProductToDeleteId(productId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDeleteId) return;

    try {
      // 1. Delete product document from Firestore
      await deleteDoc(doc(db, 'products', productToDeleteId));

      // 2. Delete images from Firebase Storage
      const imagesRef = ref(storage, `productImages/${productToDeleteId}`);
      const imageList = await listAll(imagesRef);
      const deletePromises = imageList.items.map((imageRef) => deleteObject(imageRef));
      await Promise.all(deletePromises);

      // 3. Update the local state to remove the deleted product
      setSoldExpiredProducts(soldExpiredProducts.filter((p) => p.id !== productToDeleteId));
      
      showAlert('success', 'Product and its images deleted successfully!', 5000);
    } catch (error) {
      console.error('Error deleting product:', error);
      showAlert('error', 'Failed to delete product. Please try again.', 5000);
    } finally {
      setShowDeleteModal(false);
      setProductToDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDeleteId(null);
  };

  const filteredProducts = soldExpiredProducts.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.finalPrice && product.finalPrice.toString().includes(searchTerm)) ||
      (product.price && product.price.toString().includes(searchTerm));
    return matchesSearch;
  });

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  // Pagination Logic
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Sold Products</h1>
              <p className="text-lg text-gray-600">
                View a history of all sold upcycled streetwear items
              </p>
              <div className="flex items-center space-x-6 mt-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Package className="h-4 w-4 mr-1" />
                  {soldExpiredProducts.length} Items
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products by name, price, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#135918] focus:border-[#135918] outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Products Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentProducts.length > 0 ? (
            currentProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
              >
                <div className="relative">
                  {product.imageUrls && product.imageUrls.length > 0 ? (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={product.imageUrls[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.imageUrls.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center">
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
                  <span
                    className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(product.status)}`}
                  >
                    {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1 mr-2">
                      {product.name}
                    </h3>
                    {/* ✅ UPDATED: Conditional display of prices based on product status */}
                    <div className="flex flex-col items-end">
                      {product.status === 'sold' && product.finalPrice && (
                        <div className="text-sm text-gray-700">
                          Sold for: <span className="font-bold">{formatPrice(product.finalPrice)}</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Starting price: <span className="font-bold">{formatPrice(product.price)}</span>
                      </div>
                    </div>
                    {/* ❌ END OF UPDATED SECTION */}
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {product.description}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-500">
                        <Tag className="h-4 w-4 mr-1" />
                        {product.category}
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Shirt className="h-4 w-4 mr-1" />
                        {product.size}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-500">
                        {getConditionIcon(product.condition)}
                        <span className="ml-1">{product.condition}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <>
                          <Clock className="h-4 w-4 mr-1" />
                          Sold on {new Date(product.soldAt).toLocaleDateString()}
                        </>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDetails(product)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center col-span-full">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No sold products found</h3>
              <p className="text-gray-500">Try adjusting your search criteria.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center space-x-2 mt-8">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentPage === number
                    ? 'text-white bg-[#135918]'
                    : 'text-gray-700 bg-white hover:bg-gray-100'
                }`}
              >
                {number}
              </button>
            ))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </nav>
        )}

        {showDetailModal && (
          <SoldProductDetailModal
            showModal={showDetailModal}
            setShowModal={setShowDetailModal}
            product={selectedProduct}
            formatPrice={formatPrice}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
            <div className="relative w-full max-w-md p-6 mx-4 my-8 bg-white rounded-lg shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
                <button
                  onClick={cancelDelete}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-6 text-gray-600">
                <p>Are you sure you want to delete this product? This action cannot be undone and will permanently remove the product and its images from the database.</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg bg-red-500 hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoldProducts;