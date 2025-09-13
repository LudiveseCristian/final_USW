import React, { useEffect, useState } from 'react';
import { useAlert } from "../contexts/alertContext";
import { X, CheckCircle, XCircle, Users } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

const BidManagementModal = ({ showBidModal, selectedBidProduct, setShowBidModal, setSelectedBidProduct, formatPrice, getTimeLeft, handleAcceptBid, handleRejectBid }) => {
  const [bids, setBids] = useState(selectedBidProduct?.bids || []);
  const { setAlert } = useAlert();

  useEffect(() => {
    if (!showBidModal || !selectedBidProduct?.id) {
      setBids([]);
      return;
    }

    const productDocRef = doc(db, 'products', selectedBidProduct.id);
    const unsubscribe = onSnapshot(productDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const productData = docSnap.data();
        if (productData.bids) {
          setBids(productData.bids);
        } else {
          setBids([]);
        }
      } else {
        setBids([]);
      }
    }, (error) => {
      console.error("Error listening to bids:", error);
      setAlert({
        message: 'Failed to update bids in real-time. Please reopen the modal.',
        type: 'error',
      });
    });

    return () => unsubscribe();
  }, [showBidModal, selectedBidProduct?.id, setAlert]);

  if (!showBidModal || !selectedBidProduct) return null;

  const onClose = () => {
    setShowBidModal(false);
    setSelectedBidProduct(null);
  };
  
  const handleAccept = async (productId, bidIndex) => {
    try {
      await handleAcceptBid(productId, bidIndex);
      setAlert({
        message: 'Bid accepted successfully!',
        type: 'success',
        duration: 5000
      });
      onClose();
    } catch (error) {
      console.error('Error in handleAccept:', error);
      setAlert({
        message: 'Failed to accept bid. Please try again.',
        type: 'error',
        duration: 5000
      });
    }
  };

  const handleReject = async (productId, bidIndex) => {
    try {
      await handleRejectBid(productId, bidIndex);
      setAlert({
        message: 'Bid rejected successfully.',
        type: 'success',
        duration: 5000
      });
    } catch (error) {
      console.error('Error in handleReject:', error);
      setAlert({
        message: 'Failed to reject bid. Please try again.',
        type: 'error',
        duration: 5000
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {selectedBidProduct.imageUrls?.[0] && (
                <img
                  src={selectedBidProduct.imageUrls[0]}
                  alt={selectedBidProduct.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedBidProduct.name}</h2>
                <p className="text-gray-600">Manage bids for this product</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>

          {/* Auction Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Minimum Bid</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatPrice(selectedBidProduct.minimumBid)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Current Highest</div>
                <div className="text-lg font-bold text-green-600">
                  {formatPrice(selectedBidProduct.currentBid)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Bids</div>
                <div className="text-lg font-bold text-blue-600">
                  {bids.length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Time Left</div>
                <div className="text-lg font-bold text-orange-600">
                  {getTimeLeft(selectedBidProduct.bidEndTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Bids List */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">All Bids</h3>

            {bids && bids.length > 0 ? (
              <div className="space-y-3">
                {bids
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((bid, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            {bid.bidderName?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-lg">{bid.bidderName}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(bid.timestamp).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {bid.bidderEmail && (
                            <div className="text-sm text-gray-500">{bid.bidderEmail}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {formatPrice(bid.amount)}
                          </div>
                          {index === 0 && (
                            <div className="text-sm text-green-600 font-medium">Highest Bid</div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAccept(selectedBidProduct.id, index)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-1 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleReject(selectedBidProduct.id, index)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-1 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No bids yet</h3>
                <p className="text-gray-500">You'll see bids here as users place them.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidManagementModal;