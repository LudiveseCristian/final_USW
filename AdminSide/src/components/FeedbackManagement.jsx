import React, { useState, useEffect } from 'react';

const FeedbackManagement = () => {
  const [feedback, setFeedback] = useState([]);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    // Mock data to simulate an API call
    const mockFeedback = [
      { id: '1', userName: 'Alex', rating: 5, reviewText: 'Awesome app, so easy to use! A perfect five stars.', status: 'pending', submittedAt: '2025-09-17' },
      { id: '2', userName: 'Ben', rating: 4, reviewText: 'Great features, but could be faster. The UI is a little slow to load sometimes.', status: 'pending', submittedAt: '2025-09-16' },
      { id: '3', userName: 'Catherine', rating: 5, reviewText: 'Simply the best!', status: 'approved', submittedAt: '2025-09-15' },
    ];
    setFeedback(mockFeedback);
  }, []);

  const handleApprove = (id) => {
    // In a real application, you would make an API call to update the database
    const updatedFeedback = feedback.map(item =>
      item.id === id ? { ...item, status: 'approved' } : item
    );
    setFeedback(updatedFeedback);
    setSelectedFeedback(null); // Clear the detail view after approval
    alert(`Feedback ${id} approved!`);
  };

  const pendingFeedback = feedback.filter(item => item.status === 'pending');

  const FeedbackList = ({ feedback, onSelect }) => (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      {feedback.length > 0 ? (
        feedback.map(item => (
          <div
            key={item.id}
            className="flex flex-col p-4 border-b border-gray-200 cursor-pointer transition-colors duration-200 hover:bg-green-50"
            onClick={() => onSelect(item)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-gray-900">{item.userName}</span>
              <span className="text-yellow-400">{'⭐'.repeat(item.rating)}</span>
            </div>
            <p className="text-gray-600 text-sm italic">{item.reviewText.substring(0, 70)}...</p>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 italic">No new feedback to review.</p>
      )}
    </div>
  );

  const FeedbackDetail = ({ feedback, onApprove }) => (
    <div className="bg-white p-8 rounded-lg shadow-lg h-full">
      <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6">
        <h3 className="text-2xl font-bold text-gray-900">{feedback.userName}</h3>
        <span className="text-yellow-400 text-xl">{'⭐'.repeat(feedback.rating)}</span>
      </div>
      <p className="text-gray-700 leading-relaxed mb-6">{feedback.reviewText}</p>
      <div className="text-right">
        <button
          className="bg-green-500 text-white font-semibold py-2 px-6 rounded-full shadow-md transition-transform transform hover:scale-105 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
          onClick={() => onApprove(feedback.id)}
        >
          Approve for Display
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-8 bg-stone-50 font-sans text-gray-800">
      <h1 className="text-3xl font-bold text-green-800 text-foreground mb-2">Feedback Management</h1>
          <p className="text-muted-foreground text-green-700">Manage your user feedbacks and pick to post in the app</p>
      <div className="flex flex-col md:flex-row gap-8 h-[70vh]">
        <div className="flex-1">
          <FeedbackList
            feedback={pendingFeedback}
            onSelect={setSelectedFeedback}
          />
        </div>
        <div className="flex-2 w-full md:w-3/5">
          {selectedFeedback && (
            <FeedbackDetail
              feedback={selectedFeedback}
              onApprove={handleApprove}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackManagement;