import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, ImageIcon, FileText, MoreVertical } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
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

  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4); 
  const [selectedFilter, setSelectedFilter] = useState('all');

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
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingNews(item);
    setShowModal(true);
    setDropdownOpen(null);
  };

  const handleDelete = (id) => {
    showAlert(
      "confirm",
      "Are you sure you want to delete this news article? This action cannot be undone and will permanently remove the article and its images.",
      () => deleteNews(id),
      "Delete",
      () => {
        showAlert("info", "Deletion canceled.");
      }
    );
    setDropdownOpen(null);
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
    (selectedFilter === 'all' || item.type === selectedFilter) &&
    (item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const heroArticle = news[0];
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
      <div className="min-h-screen bg-cream p-4 md:p-8 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
        `}
      </style>
      <div className="min-h-screen bg-cream text-cream">
        {/* Header Section */}
        <div className="bg-[#135918] rounded-bl-xl rounded-br-xl shadow-sm p-8 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-cream">Drops Management</h1>
                <p className="text-cream-200 mt-2">
                  Manage your news articles, updates, and product drops.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Section */}
        <div className="pl-14 mx-4 md:mx-6 lg:mx-8 mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex md:flex-row md:items-center gap-16">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-4 py-2 font-medium rounded-lg ${selectedFilter === 'all' ? 'bg-green-800 text-white' : 'bg-white/50 text-green-900 hover:bg-white'} transition-colors`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter('update')}
                  className={` px-2 py-2 font-medium rounded-lg ${selectedFilter === 'update' ? 'bg-green-800 text-white' : 'bg-white/50 text-green-900 hover:bg-white'} transition-colors`}
                >
                  Updates
                </button>
                <button
                  onClick={() => setSelectedFilter('drop')}
                  className={`px-2 py-2 font-medium rounded-lg ${selectedFilter === 'drop' ? 'bg-green-800 text-white' : 'bg-white/50 text-green-900 hover:bg-white'} transition-colors`}
                >
                  Drops
                </button>
              </nav>
              <div className="relative flex-1 max-w-4xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#135918] focus:border-[#135918] outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 no-scrollbar">
          {/* Featured Article Section */}
          <div className="relative bg-gray-900 rounded-2xl shadow-lg overflow-hidden h-96">
            {heroArticle?.mainImage && (
              <img src={heroArticle.mainImage} alt={heroArticle.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            )}
            <div className="relative p-8 flex flex-col justify-end h-full">
              <div className="bg-primary-500 text-white text-sm font-semibold px-3 py-1 rounded-full w-max mb-2">Featured Article</div>
              <h2 className="text-4xl font-bold text-white mb-2">{heroArticle?.title || 'No Featured Article'}</h2>
              <p className="text-cream text-lg mb-4 max-w-lg line-clamp-2">{heroArticle?.description}</p>
              <div className="flex items-center space-x-4">
                <Button onClick={() => { setEditingNews(heroArticle); setShowModal(true); }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Article
                </Button>
              </div>
            </div>
          </div>

          {/* Main Paginated Grid */}
          <div className="flex items-center justify-between mb-4 mt-8">
            <h3 className="text-2xl font-bold text-gray-900">All Articles</h3>
            <Button onClick={() => { setEditingNews(null); setShowModal(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Article
            </Button>
          </div>
          <div>
            {currentNews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {currentNews.map(item => (
                  <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col relative overflow-hidden h-[550px] rounded-lg group">
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  </div>
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === item.id ? null : item.id)}
                      className="text-white hover:text-gray-300 p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {dropdownOpen === item.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                      <div className="py-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex items-center px-4 py-2 text-sm text-primary-600 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900 w-full text-left transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-3" />
                          Edit News
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-900 w-full text-left transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-3" />
                          Delete News
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                  <div className="relative z-10 flex flex-col justify-end h-full p-4 text-white">
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
      </main>

      <AddNewsModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingNews={editingNews}
        onSaveSuccess={handleSave}
      />
    </div>
    </>
  );
};

export default NewsManagement;