// src/modals/CategoryModal.jsx
import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { X, Loader2, List, Trash2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import the ConfirmationModal component
import ConfirmationModal from './ConfirmationModal';

const CategoryModal = ({ showModal, setShowModal, fetchCategories }) => {
    const [categoryName, setCategoryName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [existingCategories, setExistingCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    // State for the two different confirmation modals
    const [showConfirmAdd, setShowConfirmAdd] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    const handleClose = () => {
        setShowModal(false);
        setCategoryName('');
        setError(null);
        setExistingCategories([]);
    };

    const fetchExistingCategories = async () => {
        setLoadingCategories(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'categories'));
            const categoriesList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
            }));
            setExistingCategories(categoriesList);
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (showModal) {
            fetchExistingCategories();
        }
    }, [showModal]);

    // Handle the submission request, show the confirmation modal first
    const handleAddRequest = (e) => {
        e.preventDefault();
        const trimmedCategoryName = categoryName.trim();

        if (!trimmedCategoryName) {
            setError('Category name cannot be empty.');
            return;
        }

        const isDuplicate = existingCategories.some(
            (cat) => cat.name.toLowerCase() === trimmedCategoryName.toLowerCase()
        );
        if (isDuplicate) {
            setError(`Category "${trimmedCategoryName}" already exists.`);
            return;
        }

        setError(null);
        setShowConfirmAdd(true);
    };

    // New function to handle the actual addition after confirmation
    const handleConfirmAdd = async () => {
        const trimmedCategoryName = categoryName.trim();
        setLoading(true);

        try {
            await addDoc(collection(db, 'categories'), {
                name: trimmedCategoryName,
                createdAt: new Date(),
            });

            toast.success('Category added successfully!', {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });

            fetchExistingCategories();
            setCategoryName('');
        } catch (err) {
            console.error('Error adding category:', err);
            setError('Failed to add category. Please try again.');
        } finally {
            setLoading(false);
            setShowConfirmAdd(false);
        }
    };

    const handleRemoveRequest = (categoryId, categoryName) => {
        setCategoryToDelete({ id: categoryId, name: categoryName });
        setShowConfirmDelete(true);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, 'categories', categoryToDelete.id));
            toast.info(`Category "${categoryToDelete.name}" removed.`, {
                position: "top-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            fetchExistingCategories();
        } catch (err) {
            console.error('Error removing category:', err);
            setError('Failed to remove category. Please try again.');
        } finally {
            setLoading(false);
            setCategoryToDelete(null);
            setShowConfirmDelete(false);
        }
    };

    if (!showModal) {
        return null;
    }

    return (
        <>
            <ToastContainer />
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                <div className="relative bg-white rounded-2xl shadow-xl p-8 max-w-md w-full m-4">
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Category</h2>

                    {error && (
                        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAddRequest}>
                        <div className="mb-4">
                            <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                                Category Name
                            </label>
                            <input
                                type="text"
                                id="categoryName"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#22C55E] focus:border-transparent outline-none transition"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-200"
                            disabled={loading || !categoryName.trim()}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Adding...</span>
                                </>
                            ) : (
                                <span>Add Category</span>
                            )}
                        </button>
                    </form>

                    <hr className="my-6 border-gray-200" />

                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <List className="h-5 w-5 text-gray-600 mr-2" />
                            Existing Categories
                        </h3>
                        {loadingCategories ? (
                            <p className="text-gray-500">Loading categories...</p>
                        ) : existingCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {existingCategories.map((cat) => (
                                    <div
                                        key={cat.id}
                                        className="flex items-center bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200"
                                    >
                                        <span>{cat.name}</span>
                                        <button
                                            onClick={() => handleRemoveRequest(cat.id, cat.name)}
                                            className="ml-2 text-gray-500 hover:text-red-500 transition-colors"
                                            aria-label={`Remove category ${cat.name}`}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm italic">No categories found.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal for adding a category */}
            <ConfirmationModal
                showModal={showConfirmAdd}
                setShowModal={setShowConfirmAdd}
                title="Confirm Addition"
                message={`Are you sure you want to add the category "${categoryName.trim()}"?`}
                onConfirm={handleConfirmAdd}
                onCancel={() => setShowConfirmAdd(false)}
            />

            {/* Confirmation Modal for deleting a category */}
            <ConfirmationModal
                showModal={showConfirmDelete}
                setShowModal={setShowConfirmDelete}
                title="Confirm Deletion"
                message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? This action cannot be undone.`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setCategoryToDelete(null)}
            />
        </>
    );
};

export default CategoryModal;