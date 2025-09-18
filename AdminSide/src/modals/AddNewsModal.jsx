import { useState, useEffect } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAlert } from "../contexts/alertContext";

const AddNewsModal = ({ showModal, setShowModal, editingNews, onSaveSuccess }) => {
  const { showAlert } = useAlert();
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mainImage: '',
    secondaryImages: []
  });

  const [imageFiles, setImageFiles] = useState({
    mainImage: null,
    secondaryImages: []
  });

  useEffect(() => {
    if (editingNews) {
      setFormData({
        title: editingNews.title || '',
        description: editingNews.description || '',
        mainImage: editingNews.mainImage || '',
        secondaryImages: editingNews.secondaryImages || []
      });
      setImageFiles({
        mainImage: null,
        secondaryImages: []
      });
    } else {
      resetForm();
    }
  }, [editingNews]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      mainImage: '',
      secondaryImages: []
    });
    setImageFiles({
      mainImage: null,
      secondaryImages: []
    });
  };

  const uploadImage = async (file, path) => {
    const storageRef = ref(storage, `news/${path}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const deleteImageFromStorage = async (url) => {
    if (!url || typeof url !== 'string') return;
    try {
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
      console.log("Image deleted from storage:", url);
    } catch (error) {
      console.error("Error deleting image from storage:", error);
    }
  };

  const handleImageUpload = async () => {
    const urls = { ...formData };

    try {
      setUploadingImages(true);

      // Upload main image
      if (imageFiles.mainImage) {
        const mainImageUrl = await uploadImage(
          imageFiles.mainImage,
          `main-${Date.now()}-${imageFiles.mainImage.name}`
        );
        urls.mainImage = mainImageUrl;
      }

      // Upload secondary images
      const newSecondaryUrls = [];
      if (imageFiles.secondaryImages.length > 0) {
        for (let i = 0; i < imageFiles.secondaryImages.length; i++) {
          const file = imageFiles.secondaryImages[i];
          const url = await uploadImage(
            file,
            `secondary-${Date.now()}-${i}-${file.name}`
          );
          newSecondaryUrls.push(url);
        }
      }
      urls.secondaryImages = [...(editingNews?.secondaryImages || []), ...newSecondaryUrls];

      return urls;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalData = await handleImageUpload();
      onSaveSuccess(editingNews?.id, finalData);
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving news:', error);
      showAlert("error", "Failed to save article. Please try again.");
    }
  };

  const removeSecondaryImage = (index) => {
    setFormData({
      ...formData,
      secondaryImages: formData.secondaryImages.filter((_, i) => i !== index)
    });
  };

  const removeSecondaryImageFile = (index) => {
    setImageFiles({
      ...imageFiles,
      secondaryImages: imageFiles.secondaryImages.filter((_, i) => i !== index)
    });
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingNews ? 'Edit Article' : 'Create New Article'}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 max-h-[calc(90vh-160px)] overflow-y-auto pr-4">
            {/* Title */}
            <div className="flex flex-col space-y-1">
              <label htmlFor="title" className="text-sm font-medium text-gray-700">Title</label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Enter article title"
                required
              />
            </div>

            {/* Description */}
            <div className="flex flex-col space-y-1">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white text-gray-800 border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                rows="4"
                placeholder="Write a description for your article"
                required
              />
            </div>

            {/* Main Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Image</label>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                {formData.mainImage ? (
                  <div className="relative group aspect-w-16 aspect-h-9 overflow-hidden rounded-lg">
                    <img src={formData.mainImage} alt="Main" className="object-cover w-full h-full" />
                    <button
                      type="button"
                      onClick={() => {
                        if (editingNews) {
                          const oldUrl = editingNews.mainImage;
                          deleteImageFromStorage(oldUrl);
                        }
                        setFormData({ ...formData, mainImage: '' });
                        setImageFiles({ ...imageFiles, mainImage: null });
                      }}
                      className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-8 w-8 text-white" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setImageFiles({ ...imageFiles, mainImage: file });
                          const reader = new FileReader();
                          reader.onload = (e) => setFormData({ ...formData, mainImage: e.target.result });
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="mainImageUpload"
                    />
                    <label
                      htmlFor="mainImageUpload"
                      className="cursor-pointer flex flex-col items-center justify-center py-6 text-center text-gray-600 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                      <span className="text-sm font-medium">Click to upload main image</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Images Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Images</label>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4 border border-gray-200">
                {(formData.secondaryImages.length > 0 || imageFiles.secondaryImages.length > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {/* Existing images */}
                    {formData.secondaryImages.map((img, index) => (
                      <div key={`existing-${index}`} className="relative group aspect-w-1 aspect-h-1 overflow-hidden rounded-lg">
                        <img src={img} alt={`Secondary ${index + 1}`} className="object-cover w-full h-full" />
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = formData.secondaryImages.filter((_, i) => i !== index);
                            setFormData({ ...formData, secondaryImages: newImages });
                          }}
                          className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    ))}

                    {/* New images */}
                    {imageFiles.secondaryImages.map((file, index) => (
                      <div key={`new-${index}`} className="relative group aspect-w-1 aspect-h-1 overflow-hidden rounded-lg">
                        <img src={URL.createObjectURL(file)} alt={`New ${index + 1}`} className="object-cover w-full h-full" />
                        <button
                          type="button"
                          onClick={() => removeSecondaryImageFile(index)}
                          className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload secondary images button */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      setImageFiles({ ...imageFiles, secondaryImages: [...imageFiles.secondaryImages, ...files] });
                    }}
                    className="hidden"
                    id="secondaryImagesUpload"
                  />
                  <label
                    htmlFor="secondaryImagesUpload"
                    className="cursor-pointer flex flex-col items-center justify-center py-6 text-center text-gray-600 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium">Add more images</span>
                  </label>
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
                disabled={uploadingImages}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingImages}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImages ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  editingNews ? 'Update Article' : 'Create Article'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddNewsModal;