import {
  X,
  Tag,
  Shirt,
  Star,
  Clock,
  Calendar,
  Image as ImageIcon,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

const SoldProductDetailModal = ({ showModal, setShowModal, product, formatPrice }) => {
  if (!showModal || !product) {
    return null;
  }

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const getConditionIcon = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'new':
        return <Star className="h-5 w-5 mr-2 text-gray-500" />;
      case 'good':
        return <Shirt className="h-5 w-5 mr-2 text-gray-500" />;
      default:
        return null;
    }
  };

  const sortedBids = product.bids?.sort((a, b) => b.timestamp.localeCompare(a.timestamp)) || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white rounded-3xl shadow-xl transform transition-all sm:my-8 sm:w-full sm:max-w-4xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 mb-6">
          <h3 className="text-3xl font-bold text-gray-900">Sold Product Details</h3>
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Product Image Gallery */}
          <div>
            <div className="relative overflow-hidden rounded-2xl aspect-square bg-gray-100 flex items-center justify-center">
              {product.imageUrls && product.imageUrls.length > 0 ? (
                <img
                  src={product.imageUrls[0]}
                  alt={product.name}
                  className="object-contain w-full h-full"
                />
              ) : (
                <ImageIcon className="w-16 h-16 text-gray-400" />
              )}
            </div>
            {product.imageUrls && product.imageUrls.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                {product.imageUrls.slice(1).map((url, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={url}
                      alt={`${product.name} - ${index + 2}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-2xl font-bold text-gray-900">{product.name}</h4>
              <div className="flex flex-col items-end">
                {product.status === 'sold' && (
                  <div className="text-xl font-bold text-gray-900">
                    Sold for: <span className="font-extrabold text-[#135918]">{formatPrice(product.finalPrice)}</span>
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-1">
                  Starting price: <span className="font-bold">{formatPrice(product.price)}</span>
                </div>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            <div className="grid grid-cols-2 gap-4 text-gray-700">
              <div className="flex items-center">
                <Tag className="h-5 w-5 mr-2 text-gray-500" />
                <span>Category: <span className="font-medium">{product.category}</span></span>
              </div>
              <div className="flex items-center">
                <Shirt className="h-5 w-5 mr-2 text-gray-500" />
                <span>Size: <span className="font-medium">{product.size}</span></span>
              </div>
              <div className="flex items-center">
                {getConditionIcon(product.condition)}
                <span>Condition: <span className="font-medium">{product.condition}</span></span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-gray-500" />
                <span>Sold At: <span className="font-medium">{product.soldAt ? format(new Date(product.soldAt), 'MMM dd, yyyy') : 'N/A'}</span></span>
              </div>
              <div className="flex items-center col-span-2">
                <Users className="h-5 w-5 mr-2 text-gray-500" />
                <span>Sold to: <span className="font-medium">{product.highestBidder || 'N/A'}</span></span>
              </div>
            </div>

            {product.bids && product.bids.length > 0 && (
              <>
                <h5 className="text-xl font-bold text-gray-900 mt-6">Bid History</h5>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {sortedBids.map((bid, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center py-2 ${index < sortedBids.length - 1 ? 'border-b border-gray-200' : ''}`}
                    >
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700">{formatPrice(bid.amount)}</span>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <span className="font-medium">{bid.bidderName}</span>
                        <div className="text-xs">{format(new Date(bid.timestamp), 'MMM dd, yyyy h:mm a')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoldProductDetailModal;