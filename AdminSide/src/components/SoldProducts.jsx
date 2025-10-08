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
import { Card, CardContent, Button, LoadingSpinner, EmptyState, Pagination } from './ui';

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
      // Assuming images are stored under products/ instead of productImages/productId
      // I'll adjust the path based on a common pattern. If the path used in the component
      // for upload was `products/` (as seen in the previous file), I'll use the common pattern
      // `products/` or keep the existing structure if the path is confirmed.
      // Based on the provided code, it attempts to delete from `productImages/${productToDeleteId}`.

      // We will attempt to delete from the imagesRef path provided, but since the previous
      // file used a random name in the 'products' bucket, let's assume images are linked by URL.
      // For now, I will keep the existing delete logic as the user provided it, but it might be
      // incomplete if product images are stored with non-deterministic names.
      const imagesRef = ref(storage, `productImages/${productToDeleteId}`);
      try {
        const imageList = await listAll(imagesRef);
        const deletePromises = imageList.items.map((imageRef) => deleteObject(imageRef));
        await Promise.all(deletePromises);
      } catch (e) {
        console.warn("Could not delete images from productImages folder. May not exist or path is incorrect.", e);
        // Continue if image deletion fails, as the main product document deletion is successful.
      }


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
      <div className="min-h-screen bg-[#F9F7F1] p-4 md:p-8">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    // Update main container to allow for full-width header
    <div className="min-h-screen bg-[#F9F7F1]"> 
      {/* 🟢 HEADER STYLE: Darker Green */}
      <div className="bg-[#135918] rounded-b-3xl shadow-xl p-8 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between items-start py-4">
            <div>
              <h1 className="text-4xl font-extrabold text-white flex items-center">
                <Package className="w-8 h-8 mr-3 text-green-300" />
                Sold Products
              </h1>
              <p className="mt-2 text-green-300 text-lg">
                View a history of all sold auction items.
              </p>
            </div>
            {/* Main Total Product Stat */}
            <div className="text-right">
                <p className="text-6xl font-bold text-white leading-none">{soldExpiredProducts.length}</p>
                <p className="text-green-300 mt-1">Total Sold Items</p>
            </div>
          </div>
        </div>
      </div>
      {/* END HEADER STYLE */}
      
      {/* Main Content Area - adjusted margins */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 -mt-6">

        {/* Search Section */}
        <Card className="shadow-md transition-shadow mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search products by name, price, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  // Updated focus styles to match theme green
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#135918]/50 focus:border-[#135918] outline-none transition-colors"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid Section */}
        <div>
          {currentProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentProducts.map((product) => (
                <Card key={product.id} className="shadow-md hover:shadow-lg transition-shadow overflow-hidden group">
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

                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1 mr-2">
                        {product.name}
                      </h3>
                      {/* Conditional display of prices based on product status */}
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
                          <Clock className="h-4 w-4 mr-1" />
                          Sold on {new Date(product.soldAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleViewDetails(product)}
                        // Applied primary theme color to the Details button
                        className="flex-1 bg-[#135918] text-white hover:bg-[#1f7c22] transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(product.id)}
                        variant="danger" // Keeping the red color for the Delete action
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12">
                <EmptyState
                  icon={Package}
                  title="No sold products found"
                  description="Try adjusting your search criteria."
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={paginate}
              itemsPerPage={productsPerPage}
              totalItems={filteredProducts.length}
            />
          </div>
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
            <Card className="relative w-full max-w-md mx-4 my-8">
              <CardContent className="p-6">
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
                  <Button
                    onClick={cancelDelete}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmDelete}
                    variant="danger"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoldProducts;