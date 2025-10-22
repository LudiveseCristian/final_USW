import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebase';

// User Services
export const userService = {
  // Get user profile data
  async getUserProfile(uid) {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        return null;
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      // Return null instead of throwing to prevent app crashes
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(uid, data) {
    try {
      await updateDoc(doc(db, 'users', uid), data);
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Create user profile
  async createUserProfile(uid, data) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...data,
        createdAt: serverTimestamp(),
        totalBids: 0,
        wonAuctions: 0,
        successRate: "0%"
      });
      return true;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
};

// Product Services
export const productService = {
  // Add new product
  async addProduct(productData) {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        status: 'available', // available, mine, grab, sold
        currentBid: 0,
        currentBidder: null,
        mineClaimedBy: null,
        grabClaimedBy: null,
        bidHistory: [],
        mineClaimedAt: null,
        grabClaimedAt: null,
        soldAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  },

  // Get all products
  async getAllProducts() {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        return [];
      }

      // Optimized query with composite index
      const q = query(
        collection(db, 'products'),
        where('status', '!=', 'sold'),
        orderBy('status'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting products:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Get available products (for bidding)
  async getAvailableProducts() {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        return [];
      }

      // Optimized query with composite index
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'available'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting available products:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Get product by ID
  async getProductById(productId) {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        return null;
      }

      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        return {
          id: productDoc.id,
          ...productDoc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null; // Return null instead of throwing to prevent app crashes
    }
  },

  // Update product
  async updateProduct(productId, data) {
    try {
      await updateDoc(doc(db, 'products', productId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  // Delete product
  async deleteProduct(productId) {
    try {
      await deleteDoc(doc(db, 'products', productId));
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
};

// Bidding Services
export const biddingService = {
  // Claim "Mine" - Start bidding
  async claimMine(productId, userId, userName) {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        throw new Error('Database not available');
      }

      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }
      
      const product = productDoc.data();
      
      if (product.status !== 'available') {
        throw new Error('Product is not available for claiming');
      }
      
      if (product.mineClaimedBy) {
        throw new Error('Product already has a mine claim');
      }
      
      // Update product with mine claim
      await updateDoc(productRef, {
        status: 'mine',
        mineClaimedBy: userId,
        mineClaimedByName: userName,
        mineClaimedAt: serverTimestamp(),
        currentBid: product.price,
        currentBidder: userId,
        bidHistory: [{
          userId,
          userName,
          bidAmount: product.price,
          bidType: 'mine',
          timestamp: serverTimestamp()
        }],
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error claiming mine:', error);
      throw error;
    }
  },

  // Claim "Grab" - Accept the set price
  async claimGrab(productId, userId, userName) {
    try {
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }
      
      const product = productDoc.data();
      
      if (product.status === 'sold') {
        throw new Error('Product is already sold');
      }
      
      if (product.grabClaimedBy) {
        throw new Error('Product already has a grab claim');
      }
      
      // Update product with grab claim
      await updateDoc(productRef, {
        status: 'grab',
        grabClaimedBy: userId,
        grabClaimedByName: userName,
        grabClaimedAt: serverTimestamp(),
        currentBid: product.price,
        currentBidder: userId,
        bidHistory: [...(product.bidHistory || []), {
          userId,
          userName,
          bidAmount: product.price,
          bidType: 'grab',
          timestamp: serverTimestamp()
        }],
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error claiming grab:', error);
      throw error;
    }
  },

  // "Steal" - Place a higher bid
  async placeStealBid(productId, userId, userName, bidAmount) {
    try {
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }
      
      const product = productDoc.data();
      
      if (product.status === 'sold') {
        throw new Error('Product is already sold');
      }
      
      if (bidAmount <= product.currentBid) {
        throw new Error('Bid amount must be higher than current bid');
      }
      
      // Update product with steal bid
      await updateDoc(productRef, {
        currentBid: bidAmount,
        currentBidder: userId,
        bidHistory: [...(product.bidHistory || []), {
          userId,
          userName,
          bidAmount,
          bidType: 'steal',
          timestamp: serverTimestamp()
        }],
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error placing steal bid:', error);
      throw error;
    }
  },

  // Get user's bidding history
  async getUserBids(userId) {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        return [];
      }

      // Optimized query with composite index
      const q = query(
        collection(db, 'products'),
        where('bidHistory', 'array-contains', { userId }),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user bids:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Get products claimed by user
  async getUserClaims(userId) {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        return [];
      }

      // Optimized query with composite index
      const q = query(
        collection(db, 'products'),
        where('currentBidder', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user claims:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Finalize sale after 24 hours
  async finalizeSale(productId) {
    try {
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }
      
      const product = productDoc.data();
      
      if (product.status === 'sold') {
        return true; // Already sold
      }
      
      // Check if 24 hours have passed since first claim
      const firstClaimTime = product.mineClaimedAt || product.grabClaimedAt;
      if (!firstClaimTime) {
        return false; // No claims yet
      }
      
      const now = new Date();
      const claimTime = firstClaimTime.toDate();
      const hoursDiff = (now - claimTime) / (1000 * 60 * 60);
      
      if (hoursDiff >= 24) {
        // Finalize the sale
        await updateDoc(productRef, {
          status: 'sold',
          soldAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error finalizing sale:', error);
      throw error;
    }
  }
};

// Cart Services
export const cartService = {
  // Add item to cart
  async addToCart(userId, productId, quantity = 1) {
    try {
      const cartItem = {
        userId,
        productId,
        quantity,
        addedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'cart'), cartItem);
      return docRef.id;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  // Get user's cart
  async getUserCart(userId) {
    try {
      // Check if db is initialized
      if (!db) {
        console.error('Firestore not initialized');
        return [];
      }

      const q = query(
        collection(db, 'cart'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user cart:', error);
      return []; // Return empty array instead of throwing to prevent app crashes
    }
  },

  // Update cart item quantity
  async updateCartItemQuantity(cartItemId, quantity) {
    try {
      await updateDoc(doc(db, 'cart', cartItemId), {
        quantity,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  },

  // Remove item from cart
  async removeFromCart(cartItemId) {
    try {
      await deleteDoc(doc(db, 'cart', cartItemId));
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }
};

// Storage Services
export const storageService = {
  // Upload image
  async uploadImage(file, path) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  // Get image URL
  async getImageURL(path) {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error getting image URL:', error);
      throw error;
    }
  }
};
