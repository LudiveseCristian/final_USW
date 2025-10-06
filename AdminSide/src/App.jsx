import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ProductManagement from './components/ProductManagement';
import SalesAnalytics from './components/SalesAnalytics';
import CustomerManagement from './components/CustomerManagement';
import OrderManagement from './components/OrderManagement';
import NewsManagement from './components/NewsManagement';
import SoldProducts from './components/SoldProducts'; 
import FeedbackManagement from './components/FeedbackManagement';
import Sidebar from './Layout/Sidebar';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import MessageChatbot from './ai/UpcycledAdminAssistant';
import Messages from './components/Messages'

// Import the new Alert components and context
import AlertModal from './modals/AlertModal';
import { AlertProvider, useAlert } from './contexts/alertContext';
// New wrapper component to use the context
const AppContent = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { alert, hideAlert } = useAlert(); // Access global alert state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-cream">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <MessageChatbot />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/products/solds" element={<SoldProducts />} /> {/* New Route */}
          <Route path="/news" element={<NewsManagement />} />
          <Route path="/orders" element={<OrderManagement />} />
          <Route path="/sales" element={<SalesAnalytics />} />
          <Route path="/customers" element={<CustomerManagement />} />
          <Route path="/feedback" element={<FeedbackManagement />} />
          <Route path="/messages" element={<Messages />} />
        </Routes>
      </main>

      {/* Render the global alert modal here */}
      {alert && (
        <AlertModal
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
    </div>
  );
};

// Main App component with the Router and Provider
function App() {
  return (
    <Router>
      <AlertProvider>
        <AppContent />
      </AlertProvider>
    </Router>
  );
}

export default App;