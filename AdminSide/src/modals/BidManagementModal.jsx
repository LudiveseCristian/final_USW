import React, { useEffect, useState } from 'react';
import { useAlert } from "../contexts/alertContext";
import { X, CheckCircle, Users } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// The handleRejectBid prop is no longer needed
const BidManagementModal = ({ showBidModal, selectedBidProduct, setShowBidModal, setSelectedBidProduct, formatPrice, getTimeLeft, handleAcceptBid }) => {
    const [bids, setBids] = useState(selectedBidProduct?.bids || []);
    // Correctly destructure showAlert from the context
    const { showAlert } = useAlert();

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
            // Use showAlert with the correct parameters
            showAlert('error', 'Failed to update bids in real-time. Please reopen the modal.');
        });

        return () => unsubscribe();
    }, [showBidModal, selectedBidProduct?.id, showAlert]);

    if (!showBidModal || !selectedBidProduct) return null;

    const onClose = () => {
        setShowBidModal(false);
        setSelectedBidProduct(null);
    };

    const handleAccept = async (bid) => {
        try {
            // Pass the entire bid object to handleAcceptBid
            await handleAcceptBid(selectedBidProduct.id, bid);
            // Use showAlert for success messages
            showAlert('success', 'Bid accepted successfully!', null, null, 5000);
            onClose();
        } catch (error) {
            console.error('Error in handleAccept:', error);
            // Use showAlert for error messages
            showAlert('error', 'Failed to accept bid. Please try again.', null, null, 5000);
        }
    };

    const sortedAndSlicedBids = bids
        ? [...bids].sort((a, b) => b.amount - a.amount).slice(0, 3)
        : [];

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 border border-green-500 animate-bounce-in">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        {selectedBidProduct.imageUrls?.[0] && (
                            <img
                                src={selectedBidProduct.imageUrls[0]}
                                alt={selectedBidProduct.name}
                                className="w-20 h-20 rounded-lg object-cover border border-gray-300"
                            />
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-wide">{selectedBidProduct.name}</h2>
                            <p className="text-gray-600 mt-1">Manage bids for this auction item</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Auction Info */}
                <div className="bg-gray-100 rounded-lg p-6 mb-6 border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Minimum Bid</div>
                            <div className="text-lg font-bold text-gray-900">
                                {formatPrice(selectedBidProduct.minimumBid)}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Current Highest</div>
                            <div className="text-lg font-bold text-green-600">
                                {formatPrice(selectedBidProduct.currentBid)}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Total Bids</div>
                            <div className="text-lg font-bold text-blue-600">
                                {bids.length || 0}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Time Left</div>
                            <div className="text-lg font-bold text-orange-600">
                                {getTimeLeft(selectedBidProduct.bidEndTime)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bids List */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Top 3 Bids</h3>

                    {sortedAndSlicedBids && sortedAndSlicedBids.length > 0 ? (
                        <div className="space-y-3">
                            {sortedAndSlicedBids.map((bid, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg transition-colors hover:bg-gray-100">
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
                                                onClick={() => handleAccept(bid)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-1 transition-colors"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                <span>Accept</span>
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
    );
};

export default BidManagementModal;