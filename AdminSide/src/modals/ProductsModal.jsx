import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { X, Upload, Gavel, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

const ProductsModal = ({
  showModal,
  setShowModal,
  editingProduct,
  resetForm,
  handleSubmit,
  dragActive,
  handleDrag,
  handleDrop,
  handleImageFileChange,
  uploading,
  uploadProgress,
  imageFiles,
  removeImageFile,
  formData,
  setFormData,
  removeImageUrl,
}) => {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const categoriesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoriesList);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (showModal) {
      fetchCategories();
    }
  }, [showModal]);

  // Handler for all form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Helper function to render a labeled input field
  const renderInput = (label, name, type = 'text', required = false, placeholder, min) => (
    <div className="flex flex-col space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name] || ''}
        onChange={handleChange}
        className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
        required={required}
        placeholder={placeholder}
        min={min}
      />
    </div>
  );

  return (
    showModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm">
        <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Main Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: General Info & Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* General Information */}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">General Information</h3>
                    {renderInput('Product Name', 'name', 'text', true, 'Enter product name')}
                    <div className="flex flex-col space-y-1">
                      <label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        rows="4"
                        required
                        placeholder="Describe the product details..."
                      />
                    </div>
                  </div>

                  {/* Pricing, Stock & Dimensions */}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Pricing & Dimensions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {renderInput('Price (₱)', 'price', 'number', true, '0.00', '0')}
                      <div className="flex flex-col space-y-1">
                        <label htmlFor="status" className="text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status || ''}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            let newFormData = { ...formData, status: newStatus };
                            if (newStatus !== 'available') {
                              newFormData = {
                                ...newFormData,
                                biddingEnabled: false,
                                minimumBid: '',
                                bidEndTime: '',
                              };
                            } else if (!editingProduct) {
                              newFormData.minimumBid = newFormData.price;
                            }
                            setFormData(newFormData);
                          }}
                          className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="available">Available</option>
                        </select>
                      </div>
                      {renderInput('Length (inches)', 'length', 'number', false, '0', '0')}
                      {renderInput('Width (inches)', 'width', 'number', false, '0', '0')}
                    </div>
                  </div>

                  {/* Bidding Settings */}
                  {formData.status === 'available' && (
                    <div className="bg-green-50 rounded-lg p-6 space-y-4 border border-green-200">
                      <div className="flex items-center space-x-2">
                        <Gavel className="h-5 w-5 text-green-700" />
                        <h3 className="text-lg font-semibold text-green-800">Bidding/Auction Settings</h3>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label htmlFor="bidEndTime" className="text-sm font-medium text-gray-700">
                          Bidding End Time
                        </label>
                        <input
                          type="datetime-local"
                          id="bidEndTime"
                          name="bidEndTime"
                          value={formData.bidEndTime || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bidEndTime: e.target.value,
                              biddingEnabled: !!e.target.value,
                            })
                          }
                          className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Images & Organization */}
                <div className="md:col-span-1 space-y-6">
                  {/* Product Images Upload */}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Product Images</h3>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">Drag & drop or click to upload</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md cursor-pointer transition-colors mt-2"
                      >
                        Choose Images
                      </label>
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                      <div className="mt-4 bg-green-100 rounded-lg p-3">
                        <div className="flex justify-between text-xs text-green-800 mb-1">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Image Previews */}
                    {(imageFiles.length > 0 || (formData.imageUrls && formData.imageUrls.length > 0)) && (
                      <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {[...imageFiles.map((file) => ({ url: URL.createObjectURL(file), isNew: true })), ...(formData.imageUrls || []).map(url => ({ url, isNew: false }))].map((image, idx) => (
                          <div key={idx} className="relative group aspect-w-1 aspect-h-1 overflow-hidden rounded-lg">
                            <img
                              src={image.url}
                              alt="Preview"
                              className="object-cover w-full h-full"
                            />
                            <button
                              type="button"
                              onClick={() => (image.isNew ? removeImageFile(idx) : removeImageUrl(idx))}
                              className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-5 w-5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Organize Section */}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Organize</h3>
                    {/* Category */}
                    <div className="flex flex-col space-y-1">
                      <label htmlFor="category" className="text-sm font-medium text-gray-700">
                        Category <span className="text-red-500">*</span>
                      </label>
                      {loadingCategories ? (
                        <div className="w-full px-3 py-2 text-gray-500 bg-white border border-gray-300 rounded-md animate-pulse">Loading...</div>
                      ) : (
                        <select
                          id="category"
                          name="category"
                          value={formData.category || ''}
                          onChange={handleChange}
                          className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {/* Condition */}
                    <div className="flex flex-col space-y-1">
                      <label htmlFor="condition" className="text-sm font-medium text-gray-700">
                        Condition <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="condition"
                        name="condition"
                        value={formData.condition || ''}
                        onChange={handleChange}
                        className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        required
                      >
                        <option value="">Select Condition</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    editingProduct ? 'Update Product' : 'Add Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  );
};

export default ProductsModal;