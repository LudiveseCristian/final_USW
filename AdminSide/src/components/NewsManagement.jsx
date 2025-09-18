// src/components/NewsManagement.jsx

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ImageIcon, FileText, Clock, MoreVertical } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAlert } from "../contexts/alertContext";
import AddNewsModal from '../modals/AddNewsModal';
import { Card, CardContent, Button, LoadingSpinner, EmptyState, Pagination } from './ui';

const NewsManagement = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { showAlert } = useAlert();

  // New state for dropdown menu
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const newsCollection = collection(db, "news");
      const snapshot = await getDocs(query(newsCollection, orderBy("createdAt", "desc")));
      
      const fetchedNews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNews(fetchedNews);
      setTotalItems(fetchedNews.length);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingNews(item);
    setShowModal(true);
    setDropdownOpen(null); // Close dropdown after action
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
    setDropdownOpen(null); // Close dropdown after action
  };

  const deleteNews = async (id) => {
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
      <div className="min-h-screen bg-[#F9F7F1] p-4 md:p-8">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F1] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header and Add Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary">News Management</h1>
              <p className="text-gray-600 text-lg mt-1">
                Manage and publish news articles for your users.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditingNews(null);
              setShowModal(true);
            }}
            className="flex items-center"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
        
        {/* Search */}
        <Card className="shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white text-gray-800 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
          </CardContent>
        </Card>

        {/* News Grid */}
        <div>
          {currentNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentNews.map(item => (
                <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col relative overflow-hidden h-[550px] rounded-lg">
                  {/* Main Image as Background */}
                  <div className="absolute inset-0 z-0 h-full">
                    {item.mainImage ? (
                      <img
                        src={item.mainImage}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <ImageIcon className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  </div>

                  {/* Dropdown Menu - New Addition */}
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === item.id ? null : item.id)}
                      className="text-white hover:text-gray-300 p-2 rounded-full hover:bg-black/20 transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {dropdownOpen === item.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                        <div className="py-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors"
                          >
                            <Edit className="h-4 w-4 mr-3" />
                            Edit News
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item)}
                            className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900 w-full text-left transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Delete News
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content and Buttons */}
                  <div className="relative z-10 flex flex-col justify-end h-full p-4 text-white">
                    {/* All text content */}
                    <div className="flex flex-col mb-4">
                      <div className="flex items-center text-xs text-gray-300">
                        <span>{item.type || 'Article'}</span> • <span>{new Date(item.createdAt?.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white line-clamp-2 mt-1">{item.title}</h3>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No articles found"
              description="Try adjusting your search criteria or add a new article."
            />
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={paginate}
              itemsPerPage={itemsPerPage}
              totalItems={filteredNews.length}
            />
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