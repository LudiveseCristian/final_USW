import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAlert } from "../contexts/alertContext"; 
import AddNewsModal from '../modals/AddNewsModal'; // Import the new modal component

const NewsManagement = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingNews, setEditingNews] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const { showAlert } = useAlert();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(4);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const newsCollection = collection(db, "news");
            const snapshot = await getDocs(newsCollection);

            const fetchedNews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate()));

            setNews(fetchedNews);
        } catch (error) {
            console.error("Error fetching news:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditingNews(item);
        setShowModal(true);
    };

    const handleDelete = (id, item) => {
        showAlert(
            "confirm",
            "Are you sure you want to delete this news article? This action cannot be undone and will permanently remove the article and its images.",
            () => deleteNews(id, item),
            "Delete",
            () => {
                showAlert("info", "Deletion canceled.");
            }
        );
    };

    const deleteNews = async (id, item) => {
        try {
            await deleteDoc(doc(db, 'news', id));
            showAlert("success", "Article deleted successfully!");
            fetchNews();
        } catch (error) {
            console.error('Error deleting news:', error);
            showAlert("error", "Failed to delete article. Please try again.");
        }
    };

    const handleSave = async (id, data) => {
        try {
            if (id) {
                await updateDoc(doc(db, 'news', id), data);
                showAlert("success", "Article updated successfully!");
            } else {
                await addDoc(collection(db, 'news'), {
                    ...data,
                    createdAt: new Date()
                });
                showAlert("success", "New article created successfully!");
            }
            fetchNews();
        } catch (error) {
            console.error('Error saving news:', error);
            showAlert("error", "Failed to save article. Please try again.");
        }
    };

    const filteredNews = news.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentNews = filteredNews.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredNews.length / itemsPerPage);

    const paginate = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 bg-gray-200 rounded w-64"></div>
                        <div className="h-12 bg-gray-200 rounded"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-80 bg-gray-200 rounded-xl"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F9F7F1] p-6 flex flex-col">
            <div className="max-w-7xl mx-auto p-6 flex flex-col flex-grow">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">News Management</h1>
                            <p className="text-gray-500 mt-1">{news.length} articles published</p>
                        </div>
                        <button
                            onClick={() => {
                                setEditingNews(null); // Clear any existing editing state
                                setShowModal(true);
                            }}
                            className="bg-[#2E6A2E] hover:bg-[#0F4713] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span>New Article</span>
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to first page on search
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* News Grid */}
                <div className="flex-grow">
                    {currentNews.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full items-stretch">
                        {currentNews.map(item => (
                            <div
                            key={item.id}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full"
                            >
                            {/* Main Image */}
                            <div className="relative h-48 bg-gray-100">
                                {item.mainImage ? (
                                <img
                                    src={item.mainImage}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                                ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="h-12 w-12 text-gray-300" />
                                </div>
                                )}
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{item.description}</p>
                                
                                {/* Secondary Images Preview */}
                                {item.secondaryImages && item.secondaryImages.length > 0 && (
                                <div className="flex space-x-2 mb-4">
                                    {item.secondaryImages.slice(0, 3).map((img, index) => (
                                    <img
                                        key={index}
                                        src={img}
                                        alt={`Secondary ${index + 1}`}
                                        className="w-12 h-12 object-cover rounded-lg"
                                    />
                                    ))}
                                    {item.secondaryImages.length > 3 && (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <span className="text-xs text-gray-500">+{item.secondaryImages.length - 3}</span>
                                    </div>
                                    )}
                                </div>
                                )}

                                <div className="flex space-x-2 mt-auto">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                                >
                                    <Edit className="h-4 w-4" />
                                    <span>Edit</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id, item)}
                                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete</span>
                                </button>
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                        <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No articles found</p>
                        </div>
                    )}
                    </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-8">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        {[...Array(totalPages).keys()].map(number => (
                            <button
                                key={number + 1}
                                onClick={() => paginate(number + 1)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    currentPage === number + 1
                                        ? 'bg-[#2E6A2E] text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {number + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-full text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <AddNewsModal
                showModal={showModal}
                setShowModal={setShowModal}
                editingNews={editingNews}
                onSaveSuccess={handleSave}
            />
        </div>
    );
};

export default NewsManagement;